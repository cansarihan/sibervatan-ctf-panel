#!/bin/bash
sudo apt update && sudo apt install vsftpd -y
sudo sed -i 's/anonymous_enable=NO/anonymous_enable=YES/g' /etc/vsftpd.conf
echo "Flag: {sibervatan:ftp_anonymous_entry}" | sudo tee /srv/ftp/notlar.txt
sudo systemctl restart vsftpd
sudo useradd -m -s /bin/bash ajan02
sudo mkdir /home/ajan02/.ssh
ssh-keygen -t rsa -b 2048 -f /home/ajan02/.ssh/id_rsa -N ""
sudo cp /home/ajan02/.ssh/id_rsa.pub /home/ajan02/.ssh/authorized_keys
sudo chown -R ajan02:ajan02 /home/ajan02/.ssh
echo "Flag: {sibervatan:ssh_pvt_key_found}" > /home/ajan02/ssh_flag.txt
echo "* * * * * root /tmp/cleanup.sh" | sudo tee /etc/cron.d/cleanup_task
echo "echo 'Done'" > /tmp/cleanup.sh
sudo chmod 777 /tmp/cleanup.sh
echo "Flag: {sibervatan:cron_priv_esc}" | sudo tee /root/cron_flag.txt