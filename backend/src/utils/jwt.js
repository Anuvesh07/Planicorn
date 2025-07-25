import jwt from 'jsonwebtoken'

// Generate access token
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  )
}

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
}

// Verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    // Preserve the original JWT error for proper error handling
    throw error
  }
}

// Generate both tokens
export const generateTokens = (userId) => {
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken(userId)
  
  return {
    accessToken,
    refreshToken
  }
}