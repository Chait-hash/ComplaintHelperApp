const { jwtVerify } = require('jose');
const axios = require('axios');

// Cache for JWKS
let jwksCache = null;
let jwksCacheTime = 0;

async function getJWKS() {
  // If cache is fresh (less than 1 hour old), return cached JWKS
  if (jwksCache && Date.now() - jwksCacheTime < 3600000) {
    return jwksCache;
  }

  try {
    const response = await axios.get(process.env.KEYCLOAK_JWKS_URI);
    jwksCache = response.data;
    jwksCacheTime = Date.now();
    return jwksCache;
  } catch (error) {
    console.error('Error fetching JWKS:', error);
    throw new Error('Failed to fetch JWKS');
  }
}

async function validateJWT(token) {
  try {
    const jwks = await getJWKS();
    
    // Find matching key from JWKS
    const key = jwks.keys.find(key => {
      return key.kty === 'RSA' && key.use === 'sig';
    });

    if (!key) {
      throw new Error('No matching key found in JWKS');
    }

    // Decode token without verification to get header
    const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
    
    // Verify token
    const { payload } = await jwtVerify(token, 
      new TextEncoder().encode(key.n),
      {
        algorithms: [decodedHeader.alg],
        issuer: process.env.KEYCLOAK_ISSUER,
        audience: process.env.KEYCLOAK_CLIENT_ID
      }
    );

    return {
      isValid: true,
      payload
    };
  } catch (error) {
    console.error('JWT validation error:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
}

// Middleware to validate JWT
async function jwtValidator(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const validationResult = await validateJWT(token);

  if (!validationResult.isValid) {
    return res.status(401).json({ error: validationResult.error });
  }

  // Add user info to request object
  req.user = {
    id: validationResult.payload.sub,
    email: validationResult.payload.email,
    roles: validationResult.payload.realm_access?.roles || []
  };

  next();
}

module.exports = jwtValidator;
