const express = require('express');
const fs = require('fs');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express();

const saltRounds = 10;

// --- ARA YAZILIMLAR (MIDDLEWARE) ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'ctf-gizli-anahtar',
    resave: false,
    saveUninitialized: true
}));

// --- DOSYA OKUMA VE YAZMA FONKSİYONLARI ---
const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        return [];
    }
};

const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- YETKİLENDİRME MIDDLEWARE (GÜNCELLENDİ) ---
const isAdmin = (req, res, next) => {
    // Artik isim listesine bakmiyoruz, kullanicinin isAdmin degerine bakiyoruz
    if (req.session.user && req.session.user.isAdmin === true) {
        next();
    } else {
        req.session.error = "[-] Erişim Reddedildi. Yönetici yetkiniz yok.";
        res.redirect('/');
    }
};

// ==========================================
// --- KULLANICI ROTALARI ---
// ==========================================

// Ana Sayfa (Dashboard)
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const challenges = readData('challenges.json');
    const users = readData('users.json');
    const currentUser = users.find(u => u.username === req.session.user.username);
    
    const error = req.session.error;
    const success = req.session.success;
    req.session.error = null;
    req.session.success = null;

    res.render('index', { challenges, user: currentUser, error, success });
});

// Kayıt Olma Sayfası ve İşlemi
app.get('/register', (req, res) => {
    const error = req.session.error;
    req.session.error = null;
    res.render('register', { error });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    let users = readData('users.json');
    
    if (users.find(u => u.username === username)) {
        req.session.error = "Bu ajan zaten sistemde kayıtlı!";
        return res.redirect('/register');
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        users.push({ 
            username, 
            password: hashedPassword, 
            score: 0, 
            solved: [],
            isAdmin: false // Her yeni kayit varsayilan olarak normal kullanicidir
        });
        writeData('users.json', users);
        
        req.session.success = "Kayıt başarılı! Giriş yapabilirsiniz.";
        res.redirect('/login');
    } catch (err) {
        req.session.error = "Kayıt sırasında bir hata oluştu!";
        res.redirect('/register');
    }
});

// Giriş Yapma Sayfası ve İşlemi
app.get('/login', (req, res) => {
    const error = req.session.error;
    const success = req.session.success;
    req.session.error = null;
    req.session.success = null;
    res.render('login', { error, success });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readData('users.json');
    const user = users.find(u => u.username === username);
    
    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = user;
            res.redirect('/');
        } else {
            req.session.error = "Hatalı kullanıcı adı veya şifre!";
            res.redirect('/login');
        }
    } else {
        req.session.error = "Hatalı kullanıcı adı veya şifre!";
        res.redirect('/login');
    }
});

// Çıkış Yapma İşlemi
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Flag Gönderme ve Puan Kazanma
app.post('/submit-flag', (req, res) => {
    const { challengeId, flag } = req.body;
    const challenges = readData('challenges.json');
    const users = readData('users.json');
    
    const challenge = challenges.find(c => c.id == challengeId);
    const userIndex = users.findIndex(u => u.username === req.session.user.username);

    if (challenge && challenge.flag === flag && !users[userIndex].solved.includes(challengeId.toString())) {
        users[userIndex].score += challenge.points;
        users[userIndex].solved.push(challengeId.toString());
        writeData('users.json', users);
        
        req.session.success = `[+] Pwned! #${challengeId} başarıyla çözüldü (+${challenge.points} Puan)`;
        res.redirect('/');
    } else if (users[userIndex].solved.includes(challengeId.toString())) {
        req.session.error = "[-] Bu görevi zaten tamamladınız!";
        res.redirect('/');
    } else {
        req.session.error = "[-] Hatalı flag! Tekrar deneyin.";
        res.redirect('/');
    }
});

// Liderlik Tablosu (Leaderboard)
app.get('/leaderboard', (req, res) => {
    const users = readData('users.json').sort((a, b) => b.score - a.score);
    res.render('leaderboard', { users });
});

// Kullanıcı Detay Profili
app.get('/user/:username', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const users = readData('users.json');
    const challenges = readData('challenges.json');
    const targetUser = users.find(u => u.username === req.params.username);
    
    if (!targetUser) {
        req.session.error = "Kullanıcı bulunamadı!";
        return res.redirect('/leaderboard');
    }
    
    const solvedChallenges = challenges.filter(c => targetUser.solved.includes(c.id.toString()));
    res.render('user-detail', { targetUser, solvedChallenges });
});

// ==========================================
// --- PROFESYONEL ADMİN ROTALARI ---
// ==========================================

// 1. Admin Ana Dashboard
app.get('/admin', isAdmin, (req, res) => {
    const challenges = readData('challenges.json');
    const users = readData('users.json');
    
    const totalUsers = users.length;
    const totalChallenges = challenges.length;
    let totalSolvedFlags = 0;
    users.forEach(u => { 
        totalSolvedFlags += (u.solved ? u.solved.length : 0); 
    });

    const error = req.session.error;
    const success = req.session.success;
    req.session.error = null;
    req.session.success = null;

    res.render('admin', { totalUsers, totalChallenges, totalSolvedFlags, error, success });
});

// 2. Admin Görev Yönetimi Sayfası
app.get('/admin/challenges', isAdmin, (req, res) => {
    const challenges = readData('challenges.json');
    const error = req.session.error;
    const success = req.session.success;
    req.session.error = null;
    req.session.success = null;
    res.render('admin-challenges', { challenges, error, success });
});

// 3. Admin Kullanıcı Yönetimi Sayfası
app.get('/admin/users', isAdmin, (req, res) => {
    const users = readData('users.json');
    const error = req.session.error;
    const success = req.session.success;
    req.session.error = null;
    req.session.success = null;
    res.render('admin-users', { users, error, success });
});

// ==========================================
// --- ADMİN POST İŞLEMLERİ ---
// ==========================================

// Admin: Tüm Skorları Sıfırla
app.post('/admin/reset-scores', isAdmin, (req, res) => {
    let users = readData('users.json');
    users = users.map(u => { 
        u.score = 0; 
        u.solved = []; 
        return u; 
    });
    writeData('users.json', users);
    req.session.success = "[!] DİKKAT: Tüm ajanların skorları sıfırlandı!";
    res.redirect('/admin');
});

// Admin: Yeni Görev Ekle
app.post('/admin/challenge/add', isAdmin, (req, res) => {
    let challenges = readData('challenges.json');
    const newId = parseInt(req.body.id);
    if (challenges.find(c => c.id === newId)) {
        req.session.error = "[-] Bu ID numarası zaten kullanımda!";
        return res.redirect('/admin/challenges');
    }
    challenges.push({
        id: newId,
        title: req.body.title,
        points: parseInt(req.body.points),
        flag: req.body.flag,
        hint: req.body.hint,
        ip: req.body.ip || "10.10.74.25"
    });
    writeData('challenges.json', challenges);
    req.session.success = "[+] Yeni görev başarıyla eklendi!";
    res.redirect('/admin/challenges');
});

// Admin: Görev Güncelle
app.post('/admin/challenge/edit', isAdmin, (req, res) => {
    let challenges = readData('challenges.json');
    const index = challenges.findIndex(c => c.id == req.body.id);
    if (index !== -1) {
        challenges[index].title = req.body.title;
        challenges[index].points = parseInt(req.body.points);
        challenges[index].flag = req.body.flag;
        challenges[index].hint = req.body.hint;
        challenges[index].ip = req.body.ip || "10.10.74.25";
        writeData('challenges.json', challenges);
        req.session.success = "Görev başarıyla güncellendi!";
    }
    res.redirect('/admin/challenges');
});

// Admin: Görev Sil
app.post('/admin/challenge/delete', isAdmin, (req, res) => {
    let challenges = readData('challenges.json');
    challenges = challenges.filter(c => c.id != req.body.id);
    writeData('challenges.json', challenges);
    req.session.success = `[+] Görev #${req.body.id} silindi.`;
    res.redirect('/admin/challenges');
});

// Admin: Kullanıcı Sil
app.post('/admin/user/delete', isAdmin, (req, res) => {
    let users = readData('users.json');
    users = users.filter(u => u.username !== req.body.username);
    writeData('users.json', users);
    req.session.success = `${req.body.username} silindi.`;
    res.redirect('/admin/users');
});

// Sunucuyu Başlat
app.listen(3000, '0.0.0.0', () => {
    console.log('SiberVatan CTF Paneli http://0.0.0.0:3000 adresinde çalışıyor.');
});