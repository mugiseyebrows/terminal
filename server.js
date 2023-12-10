const path = require('path')
const { spawn, execFileSync } = require('child_process');
const request = require("request")
const fs = require('fs')

const KEY_ENDPOINT = 'http://89.104.69.220:3000/key'

function http_post(url, files = {}) {
    return new Promise((resolve, reject) => {
        let formData = {}
        for(var name in files) {
            formData[name] = fs.createReadStream(files[name])
        }
        let options = {
            method: "POST",
            url,
            formData,
        }
        request(options, function (err, res, body) {
            if(err) {
                return reject(err)
            }
            resolve(body)
        });
    })
}

async function setup() {
    console.log('install openssh')
    execFileSync('C:\\msys64\\usr\\bin\\bash.exe', ['-lc', "pacman -S openssh --noconfirm --needed --logfile ./pacman.log"])
    console.log('generate key')
    try {
        execFileSync('C:\\msys64\\usr\\bin\\ssh-keygen.exe', ['-b', '2048', '-t', 'rsa', '-f', "/home/runneradmin/.ssh/id_rsa", '-q', '-N', ''])
    } catch (e) {
        console.log(e.stdout.toString())
        console.log(e.stderr.toString())
    }
    console.log('post key')
    let body = await http_post(KEY_ENDPOINT, {key: 'C:\\msys64\\home\\runneradmin\\.ssh\\id_rsa.pub'})
    console.log(body)
}

async function run() {
    //let pty_dir = path.join(__dirname, 'pty')
    console.log('spawn server')
    let server_proc = spawn('node', ['index.js'])
    console.log('spawn ssh tunnel')
    let ssh_cmd = 'C:\\msys64\\usr\\bin\\ssh.exe -o StrictHostKeyChecking=no -N -R 8000:127.0.0.1:3000 github@89.104.69.220'.split(' ')
    let ssh_proc = spawn(ssh_cmd[0], ssh_cmd.slice(1))
    for (let proc of [server_proc, ssh_proc]) {
        proc.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        proc.stderr.on('data', (data) => {
            console.error(data.toString());
        });
        proc.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        }); 
    }
}

setup().then(run)