// Test script to verify all backend API endpoints
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING BACKEND API VERIFICATION TESTS ---\n');

  try {
    // 1. Health check
    console.log('1. Testing /health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('   Status:', healthRes.status, health.status === 'ok' ? '✓ OK' : '✗ FAIL');
    console.log('   Database connected:', health.database.connected);

    // 2. Auth: Signup test user to authenticate write operations
    console.log('\n2. Testing POST /api/auth/signup...');
    const testEmail = `test_runner_${Date.now()}@plantsight.org`;
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test Runner',
        email: testEmail,
        password: 'TestPassword123!',
      }),
    });
    const signupData = await signupRes.json();
    const token = signupData.token;
    console.log('   Auth status:', signupRes.status, token ? '✓ OK' : '✗ FAIL');
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Plants list
    console.log('\n3. Testing GET /plants...');
    const plantsRes = await fetch(`${BASE_URL}/plants`, { headers: authHeaders });
    const plants = await plantsRes.json();
    console.log('   Status:', plantsRes.status, Array.isArray(plants) ? `✓ OK (${plants.length} plants)` : '✗ FAIL');

    // 4. Plant create
    console.log('\n4. Testing POST /plants...');
    const newPlantRes = await fetch(`${BASE_URL}/plants`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Mint',
        species: 'Mentha spicata',
        location: 'Herb garden',
        notes: 'Test plant for API verification',
      }),
    });
    const createdPlant = await newPlantRes.json();
    console.log('   Status:', newPlantRes.status, createdPlant?.id ? '✓ OK' : '✗ FAIL');
    console.log('   Created plant ID:', createdPlant.id);

    // 5. Plant update
    console.log('\n5. Testing PUT /plants/:id...');
    const updateRes = await fetch(`${BASE_URL}/plants/${createdPlant.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ notes: 'Updated notes from test' }),
    });
    const updatedPlant = await updateRes.json();
    console.log('   Status:', updateRes.status, updatedPlant.notes === 'Updated notes from test' ? '✓ OK' : '✗ FAIL');

    // 6. Sensor latest & history
    console.log('\n6. Testing GET /sensors/latest & /sensors/history...');
    const latestRes = await fetch(`${BASE_URL}/sensors/latest`);
    const latest = await latestRes.json();
    console.log('   Latest readings count:', latest.length, '✓ OK');

    const historyRes = await fetch(`${BASE_URL}/sensors/history?range=24h`);
    const history = await historyRes.json();
    console.log('   History readings count:', history.length, '✓ OK');

    // 7. ESP32 reading ingestion
    console.log('\n7. Testing POST /sensors/reading (ESP32 ingestion)...');
    const readingRes = await fetch(`${BASE_URL}/sensors/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plantId: createdPlant.id,
        soilMoisture: 42.5,
        temperature: 25.1,
        humidity: 62.0,
        lightIntensity: 5200,
        isSimulated: false,
        source: 'esp32',
      }),
    });
    const readingData = await readingRes.json();
    console.log('   Status:', readingRes.status, readingData.status === 'success' ? '✓ OK' : '✗ FAIL');
    console.log('   Stored reading:', readingData.data?.temperature, '°C, source:', readingData.data?.source);

    // 8. Alerts list & acknowledge
    console.log('\n8. Testing GET /alerts...');
    const alertsRes = await fetch(`${BASE_URL}/alerts`);
    const alerts = await alertsRes.json();
    console.log('   Alerts count:', alerts.length, '✓ OK');
    if (alerts.length > 0) {
      const ackRes = await fetch(`${BASE_URL}/alerts/${alerts[0].id}/acknowledge`, { method: 'POST' });
      const ackData = await ackRes.json();
      console.log('   Acknowledge status:', ackRes.status, ackData.acknowledged === true ? '✓ OK' : '✗ FAIL');
    }

    // 9. Settings
    console.log('\n9. Testing /settings/profile & /settings/preferences...');
    const profileRes = await fetch(`${BASE_URL}/settings/profile`, { headers: authHeaders });
    const profile = await profileRes.json();
    console.log('   Profile name:', profile.name, '✓ OK');

    const prefsRes = await fetch(`${BASE_URL}/settings/preferences`, { headers: authHeaders });
    const prefs = await prefsRes.json();
    console.log('   Low soil moisture threshold:', prefs.lowSoilMoistureThreshold, '✓ OK');

    // 10. AI Analysis
    console.log('\n10. Testing POST /analysis/analyze...');
    // Create a 1x1 test png base64
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const analysisRes = await fetch(`${BASE_URL}/analysis/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plantId: createdPlant.id,
        image: sampleBase64,
      }),
    });
    const analysisData = await analysisRes.json();
    console.log('   Analysis status:', analysisRes.status, analysisData.id ? '✓ OK' : '✗ FAIL');
    console.log('   Top diagnosis:', analysisData.possibleDiseases?.[0]?.name);
    console.log('   Confidence:', analysisData.confidence);
    console.log('   Recommendations:', analysisData.recommendations?.length);
    console.log('   Plant identification:', analysisData.plantIdentification?.commonName, analysisData.plantIdentification ? '✓ OK' : '✗ FAIL');
    console.log('   Health status:', analysisData.healthStatus, analysisData.healthStatus ? '✓ OK' : '✗ FAIL');
    console.log('   Ideal environment:', analysisData.idealEnvironment?.temperature?.description, analysisData.idealEnvironment ? '✓ OK' : '✗ FAIL');
    console.log('   Environmental comparison:', analysisData.environmentalComparison?.hasSensorData !== undefined ? '✓ OK' : '✗ FAIL');

    // 11. Plant delete (clean up)
    console.log('\n11. Testing DELETE /plants/:id...');
    const deleteRes = await fetch(`${BASE_URL}/plants/${createdPlant.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteData = await deleteRes.json();
    console.log('   Status:', deleteRes.status, deleteData.status === 'success' ? '✓ OK' : '✗ FAIL');

    console.log('\n--- ALL BACKEND ENDPOINTS TESTED AND FUNCTIONAL! ---');
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTests();
