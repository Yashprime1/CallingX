const express = require('express')
const app = express()
const port = 3000


// Socket Logic
const http = require('http')
const { Server } = require("socket.io")
const server = http.createServer(app)
const io = new Server(port,{
    cors: {
        origin: ["*"]
    }
})

io.on('connection', (socket) => {
    console.log('someone connected!');
    socket.on('message',message => {
        console.log('Message: '+ message)
        socket.broadcast.emit('message',message)
    })
    socket.on('disconnect',reason => {
        console.log('User disconnected : '+ reason)
    })
});

app.get('/', (req, res) => {
  res.sendFile(__dirname+"/index.html")
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})