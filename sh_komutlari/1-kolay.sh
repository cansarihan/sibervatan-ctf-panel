#!/bin/bash
sudo apt update && sudo apt install apache2 -y
echo -e "User-agent: *\nDisallow: /secret_panel_v1" | sudo tee /var/www/html/robots.txt
sudo mkdir /var/www/html/secret_panel_v1
echo "Flag: {sibervatan:robots_txt_leak}" | sudo tee /var/www/html/secret_panel_v1/flag.txt
sudo useradd -m -s /bin/bash ajan01
echo "ajan01:password123" | sudo chpasswd
echo "Flag: {sibervatan:ls_hidden_files}" > /home/ajan01/.flag.txt
echo "history" >> /home/ajan01/.bash_history
echo "Flag: {sibervatan:history_revealed}" > /home/ajan01/secret_note.txt
sudo chown -R ajan01:ajan01 /home/ajan01/