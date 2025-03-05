# SalesPal - Wireless Retail Sales Tracking Application

SalesPal is a comprehensive web application designed for wireless retail employees to track sales, calculate commissions, and analyze sales trends. It offers both manual sales entry and automated data extraction from receipts/invoices.

## Features

- **User Authentication**: Secure login and registration system
- **Dashboard**: Visual overview of sales performance and commission earnings
- **Sales Entry**: 
  - Manual entry with product details
  - Upload and parse receipts/invoices (images or PDFs)
- **Sales Analysis**:
  - Track sales history
  - Filter and search capabilities
  - Commission calculations
  - Product performance metrics
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Tesseract.js for OCR (image text recognition)
- PDF-parse for PDF text extraction
- bcrypt for password hashing

### Frontend
- React with React Router
- Vite for build tooling
- Bootstrap & React Bootstrap for UI
- Chart.js for data visualization
- Formik and Yup for form handling and validation
- Axios for API requests

## Getting Started

### Prerequisites
- Node.js
- npm or yarn

### Installation

1. Install backend dependencies
   ```
   cd backend
   npm install
   ```

2. Install frontend dependencies
   ```
   cd ../frontend
   npm install
   ```

3. Start the backend server
   ```
   cd ../backend
   npm run dev
   ```

4. Start the frontend server
   ```
   cd ../frontend
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## PDF Parser Testing

SalesPal includes tools to test the PDF parsing functionality:

### Using the Testing Scripts

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Run the PDF test script:
   ```bash
   cd scripts
   ./test-pdf-parser.sh /path/to/your/receipt.pdf
   ```

### Standalone PDF Parser Tester

A separate tool is available for testing PDF parsing independently:

1. Navigate to the tester directory:
   ```bash
   cd pdf-parser-tester
   ```

2. Install dependencies if needed:
   ```bash
   npm install
   ```

3. Test a specific PDF file:
   ```bash
   node parser.js /path/to/your/receipt.pdf
   ```

4. Or test all sample PDFs:
   ```bash
   ./test-samples.sh
   ```

## Login Information

Default login credentials:
- Employee: demo@salespal.com / demo123
- Admin: admin@salespal.com / demo123

## Data Parsing

The application uses OCR and pattern matching to extract information from receipts and invoices:
- Customer name and phone number
- Product details (name, quantity, price)
- Total sale amount

Key improvements in the PDF parsing:
- Handles PDFs with doubled characters (`LLSSPP` becomes `LSP`)
- Fixes issues with doubled dollar signs and decimal points
- Applies reasonable limits to prices and quantities
- Validates data before displaying and submitting

## License

This project is licensed under the MIT License.