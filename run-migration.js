const http = require('http');

console.log('🔧 Running database migration...\n');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/setup',
    method: 'POST',
};

const req = http.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);

    let data = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('📦 Response:', data);

        if (res.statusCode === 200) {
            console.log('\n✅ Migration completed successfully!');
            console.log('🎯 Now try creating a mood post again.');
        } else {
            console.log('\n❌ Migration failed. Check the response above.');
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
    console.log('\n💡 Make sure your dev server is running (npm run dev)');
});

req.end();
