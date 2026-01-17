/**
 * Lambda Handlers Index
 * 
 * This file serves as a reference guide for all Lambda handler exports.
 * Use this to understand the complete API structure.
 * 
 * All handlers are consolidated in feature folders for better organization.
 */

// ============================================================================
// PRODUCTS HANDLERS
// ============================================================================

// Get all products
export { getAllProducts } from './handlers/products';

// Get products by category
export { getProductsByCategory } from './handlers/products';

// Get specific product by ID
export { getProductById } from './handlers/products';

// Add new product (requires admin token)
export { addProduct } from './handlers/products';

// Update existing product (requires admin token)
export { updateProduct } from './handlers/products';

// Delete product (requires admin token)
export { deleteProduct } from './handlers/products';

// Download product catalogue (requires admin token)
export { downloadCatalogue } from './handlers/products';

// Fetch image from S3
export { fetchS3Image } from './handlers/products';

// Get all product categories
export { getCategories } from './handlers/products';

// Save product categories (requires admin token)
export { saveCategories } from './handlers/products';

// ============================================================================
// LOGIN HANDLERS
// ============================================================================

// Login endpoint - authenticate user
export { login } from './handlers/login';

// Logout endpoint
export { logout } from './handlers/login';

// Check authentication status
export { checkAuth } from './handlers/login';

// ============================================================================
// TESTIMONIALS HANDLERS
// ============================================================================

// Get all testimonials
export { getAllTestimonials } from './handlers/testimonials';

// Add new testimonial (requires admin token)
export { addTestimonial } from './handlers/testimonials';

// Update testimonial (requires admin token)
export { updateTestimonial } from './handlers/testimonials';

// Delete testimonial (requires admin token)
export { deleteTestimonial } from './handlers/testimonials';

// ============================================================================
// ENQUIRIES HANDLERS
// ============================================================================

// Get all customer enquiries (requires admin token)
export { getEnquiries } from './handlers/enquiries';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export * from '../lambda/utils';
