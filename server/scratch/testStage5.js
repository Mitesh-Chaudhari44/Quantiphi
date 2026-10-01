const http = require('http');

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

async function runStage5Tests() {
  console.log('--- Testing Stage 5 Friend Invite & ShareLink Endpoints ---');

  // 1. Register Owner
  const emailA = 'owner_' + Date.now() + '@example.com';
  const regA = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Owner User', email: emailA, password: 'password123', city: 'San Francisco' });
  const tokenA = regA.body.data.token;
  const authHeaderA = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA };

  // 2. RSVP Owner
  await request({
    hostname: 'localhost', port: 5000, path: '/api/rsvps', method: 'POST',
    headers: authHeaderA
  }, { eventId: 'seed-101', status: 'interested' });

  // 3. Generate ShareLink
  const shareRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/events/seed-101/share', method: 'POST',
    headers: authHeaderA
  });
  console.log('Test 1 [POST /api/events/seed-101/share]: Status', shareRes.status);
  console.log('Success:', shareRes.body.success, '| Token:', shareRes.body.data.token, '| FullUrl:', shareRes.body.data.fullUrl);

  const inviteToken = shareRes.body.data.token;

  // 4. Unique Visitor Click 1
  const click1 = await request({
    hostname: 'localhost', port: 5000, path: '/api/share/' + inviteToken, method: 'GET',
    headers: { 'Cookie': 'visitorId=visitor_unique_9991' }
  });
  console.log('\nTest 2 [GET /api/share/:token - Visitor 1]: Status', click1.status);
  console.log('Redirect Location:', click1.headers.location);

  // 5. Unique Visitor Click 2
  const click2 = await request({
    hostname: 'localhost', port: 5000, path: '/api/share/' + inviteToken, method: 'GET',
    headers: { 'Cookie': 'visitorId=visitor_unique_9992' }
  });
  console.log('\nTest 3 [GET /api/share/:token - Visitor 2]: Status', click2.status);

  // 6. Duplicate Click from Visitor 1 (should NOT increment count)
  await request({
    hostname: 'localhost', port: 5000, path: '/api/share/' + inviteToken, method: 'GET',
    headers: { 'Cookie': 'visitorId=visitor_unique_9991' }
  });

  // 7. Verify unique friends count for Owner A
  const friendsRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/events/seed-101/friends', method: 'GET',
    headers: authHeaderA
  });
  console.log('\nTest 4 [GET /api/events/seed-101/friends]: Status', friendsRes.status);
  console.log('Success:', friendsRes.body.success, '| Unique Friends Count:', friendsRes.body.data.count);
}

runStage5Tests().catch(err => console.error('Stage 5 Test Error:', err));
