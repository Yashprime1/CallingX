const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const AmiClient = require('asterisk-ami-client');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

const ASTERISK_HOST = '13.233.7.28';
const ASTERISK_PORT = 5038;
const ASTERISK_USER = 'asterisk';
const ASTERISK_PASS = 'asterisk';

let client = new AmiClient();

// Connect to Asterisk AMI
client.connect(ASTERISK_USER, ASTERISK_PASS, { host: ASTERISK_HOST, port: ASTERISK_PORT })
    .then(() => console.log('✅ Connected to Asterisk AMI'))
    .catch(error => console.error('❌ AMI Connection Error:', error));

// AMI Event Handlers
client
    .on('connect', () => console.log('✅ AMI Connected'))
    .on('disconnect', () => console.warn('❌ AMI Disconnected'))
    .on('reconnection', () => console.log('🔄 AMI Reconnecting'))
    .on('event', event => console.log('📡 AMI Event:', event))
    .on('response', response => console.log('📩 AMI Response:', response))
    .on('internalError', error => console.error('⚠️ AMI Internal Error:', error));

// Handle incoming socket connections
io.on('connection', socket => {
    console.log('🔗 New Socket Connection:', socket.id);

    // 📞 Handle VoIP Call
    socket.on('call_voip', async (data) => {
        data = JSON.parse(data);
        console.log(`📞 Calling VoIP from ${data.from} to ${data.to}`);

        const originateAction = {
            Action: "Originate",
            Channel: `SIP/${data.to}`,
            Context: "internal",
            Exten: data.to,
            Priority: 1,
            CallerID: data.from || "1000",
            Timeout: 30000
        };

        console.log("📤 Sending Originate Action to AMI:", originateAction);

        try {
            const response = await client.action(originateAction);
            console.log("✅ VoIP Call Started:", response);
            socket.emit("call_status", { status: "success", response });
        } catch (err) {
            console.error("❌ VoIP Call Error:", err);
            socket.emit("call_status", { status: "failed", error: err });
        }
    });

    // 📞 Handle PSTN Call
    socket.on('call_pstn', async (data) => {
        data = JSON.parse(data);
        console.log(`📞 Calling PSTN from ${data.from} to ${data.to}`);

        const originateAction = {
            Action: "Originate",
            Channel: `DAHDI/g0/${data.to}`,
            Context: "internal",
            Exten: data.to,
            Priority: 1,
            CallerID: data.from || "1000",
            Timeout: 30000
        };

        console.log("📤 Sending PSTN Originate Action to AMI:", originateAction);

        try {
            const response = await client.action(originateAction);
            console.log("✅ PSTN Call Started:", response);
            socket.emit("call_status", { status: "success", response });
        } catch (err) {
            console.error("❌ PSTN Call Error:", err);
            socket.emit("call_status", { status: "failed", error: err });
        }
    });

    // 📴 Handle Call Cancellation
    socket.on('cancel_pstn', async (data) => {
        data = JSON.parse(data);
        console.log(`📴 Cancelling Call: ${data.channel}`);

        const hangupAction = {
            Action: "Hangup",
            Channel: data.channel
        };

        console.log("📤 Sending Hangup Action to AMI:", hangupAction);

        try {
            const response = await client.action(hangupAction);
            console.log("✅ Call Hung Up:", response);
            socket.emit("call_status", { status: "success", response });
        } catch (err) {
            console.error("❌ Call Hangup Error:", err);
            socket.emit("call_status", { status: "failed", error: err });
        }
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
        console.log('❌ Socket Disconnected:', socket.id);
    });
});

// Start the Server
server.listen(3000, () => console.log("🚀 Server running on port 3000"));
