const socket = new WebSocket('wss://wakame02m.glitch.me/chat');

const chatWindow = document.getElementById('chat-window');
const message = document.getElementById('message');
const username = document.getElementById('username');
const sendButton = document.getElementById('send');
const output = document.getElementById('output');
const imageUpload = document.getElementById('image-upload');

socket.onopen = () => {
    console.log('Connected to server');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'history') {
        data.messages.forEach(displayMessage);
    } else {
        displayMessage(data);
    }
};

function sendMessage() {
    if (message.value === '' && imageUpload.files.length === 0) {
        alert('メッセージまたは画像を入力してください');
        return;
    }

    const msg = {
        message: message.value,
        image: null,
        type: 'message'
    };

    if (imageUpload.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (event) => {
            msg.image = event.target.result;
            socket.send(JSON.stringify(msg));
        };
        reader.readAsDataURL(imageUpload.files[0]);
    } else {
        socket.send(JSON.stringify(msg));
    }

    message.value = '';
    imageUpload.value = '';
}

sendButton.addEventListener('click', sendMessage);

message.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

function displayMessage(data) {
    const msgElement = document.createElement('div');
    msgElement.classList.add('message');

    if (data.image) {
        const imgElement = document.createElement('img');
        imgElement.src = data.image;
        msgElement.appendChild(imgElement);
    }

    msgElement.textContent = `${data.user}: ${data.message || ''}`;
    output.appendChild(msgElement);
    chatWindow.scrollTop = chatWindow.scrollHeight; // 自動スクロール
}
