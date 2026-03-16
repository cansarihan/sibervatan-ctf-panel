#!/bin/bash
sudo useradd -m -s /bin/bash ajan03
echo "ajan03:hard_password_2026" | sudo chpasswd
sudo chmod +s /usr/bin/find
sudo setcap cap_setuid+ep /usr/bin/python3 2>/dev/null
echo "Flag: {sibervatan:suid_bit_exploit}" > /home/ajan03/user_flag.txt
echo "Flag: {sibervatan:operation_complete_hero}" | sudo tee /root/root_flag.txt
echo "Ymx1ZW5ldHdvcms6YmFzZTY0X2RlY29kZWQ=" > /home/ajan03/encoded.txt