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

async function runStage6Tests() {
  console.log('--- Testing Stage 6 Reminder & Notification Endpoints ---');

  // 1. Register User
  const email = 'reminder_tester_' + Date.now() + '@example.com';
  const regRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Reminder User', email, password: 'password123', city: 'San Francisco' });

  const token = regRes.body.data.token;
  const authHeader = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  console.log('Test 0 [Register User]: Status', regRes.status, '| User:', email);

  // 2. RSVP to event 'seed-101' (which is scheduled for today)
  const rsvpRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/rsvps', method: 'POST',
    headers: authHeader
  }, { eventId: 'seed-101', status: 'confirmed' });
  console.log('\nTest 1 [POST /api/rsvps]: Status', rsvpRes.status, '| RSVP Reminder Enabled:', rsvpRes.body.data.reminder?.enabled);

  // 3. Update per-event reminder settings (PATCH /api/rsvps/seed-101/reminder)
  const updateRemRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/rsvps/seed-101/reminder', method: 'PATCH',
    headers: authHeader
  }, { enabled: true, remindBeforeMinutes: 1440 });
  console.log('\nTest 2 [PATCH /api/rsvps/seed-101/reminder]: Status', updateRemRes.status);
  console.log('Success:', updateRemRes.body.success, '| RemindBeforeMinutes:', updateRemRes.body.data?.reminder?.remindBeforeMinutes);

  // 4. Trigger dev reminder check (POST /api/dev/trigger-reminders)
  const devRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/dev/trigger-reminders', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('\nTest 3 [POST /api/dev/trigger-reminders]: Status', devRes.status);
  console.log('Success:', devRes.body.success, '| Triggered Count:', devRes.body.data?.triggeredCount);

  // 5. Fetch Notifications (GET /api/notifications)
  const notifRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/notifications', method: 'GET',
    headers: authHeader
  });
  console.log('\nTest 4 [GET /api/notifications]: Status', notifRes.status);
  console.log('Success:', notifRes.body.success, '| Total Notifications:', notifRes.body.data?.notifications?.length);

  if (notifRes.body.data?.notifications?.length > 0) {
    const notifId = notifRes.body.data.notifications[0]._id;
    // 6. Mark Notification Read (PATCH /api/notifications/:id/read)
    const readRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/notifications/' + notifId + '/read', method: 'PATCH',
      headers: authHeader
    });
    console.log('\nTest 5 [PATCH /api/notifications/:id/read]: Status', readRes.status);
    console.log('Success:', readRes.body.success, '| Read Status:', readRes.body.data?.read);
  }
}

runStage6Tests().catch(err => console.error('Stage 6 Test Error:', err));
