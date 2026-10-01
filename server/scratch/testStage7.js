const http = require('http');
const { io } = require('socket.io-client');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runStage7Tests() {
  console.log('--- Testing Stage 7 Real-Time Chat Assistant Endpoints ---');

  // 1. Register User
  const email = 'chat_tester_' + Date.now() + '@example.com';
  const regRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Chat User', email, password: 'password123', city: 'San Francisco' });

  const token = regRes.body.data.token;
  const authHeader = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  console.log('Test 0 [Register User]: Status', regRes.status, '| User:', email);

  // 2. Connect Socket.IO client
  const socket = io('http://localhost:5000', {
    auth: { token: 'Bearer ' + token },
  });

  await new Promise((resolve) => socket.on('connect', resolve));
  console.log('Test 1 [Socket.IO Connected]: Socket ID', socket.id);

  // 3. Emit "chat:message" { text: "Find music events in San Francisco" }
  console.log('\nEmitting chat:message -> "Find music events in San Francisco"');
  
  const replyPromise = new Promise((resolve) => {
    socket.on('chat:reply', (data) => {
      resolve(data);
    });
  });

  socket.emit('chat:message', { text: 'Find music events in San Francisco' });

  const replyData = await replyPromise;
  console.log('Test 2 [chat:reply Received]:');
  console.log('Role:', replyData.role, '| Text:\n' + replyData.text);
  console.log('Events in Payload:', replyData.payload?.events?.length || 0);

  // 4. Test "rsvp 1" command
  const rsvpReplyPromise = new Promise((resolve) => {
    socket.on('chat:reply', (data) => {
      resolve(data);
    });
  });

  console.log('\nEmitting chat:message -> "rsvp 1"');
  socket.emit('chat:message', { text: 'rsvp 1' });

  const rsvpReply = await rsvpReplyPromise;
  console.log('Test 3 [chat:reply RSVP Result]:\n' + rsvpReply.text);

  // 5. Fetch Chat History (GET /api/chat/history)
  const historyRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/chat/history', method: 'GET',
    headers: authHeader
  });
  console.log('\nTest 4 [GET /api/chat/history]: Status', historyRes.status);
  console.log('Success:', historyRes.body.success, '| Saved Messages Count:', historyRes.body.data?.length);

  socket.disconnect();
}

runStage7Tests().catch(err => console.error('Stage 7 Test Error:', err));
