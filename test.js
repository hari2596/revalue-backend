 // Test if packages are installed
console.log('Testing package installations...\n');

try {
  require('express');
  console.log('✅ express installed');
  
  require('mongoose');
  console.log('✅ mongoose installed');
  
  require('bcryptjs');
  console.log('✅ bcryptjs installed');
  
  require('jsonwebtoken');
  console.log('✅ jsonwebtoken installed');
  
  require('dotenv');
  console.log('✅ dotenv installed');
  
  require('cors');
  console.log('✅ cors installed');
  
  require('multer');
  console.log('✅ multer installed');
  
  require('express-validator');
  console.log('✅ express-validator installed');
  
  console.log('\n🎉 All packages installed successfully!');
} catch (error) {
  console.log('❌ Error:', error.message);
}
