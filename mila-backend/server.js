require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🌿 Pure Vitality Market Server`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Moi truong: ${process.env.NODE_ENV || 'development'}\n`);
});
