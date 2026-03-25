EnviroSync - Setup Guide for Team
📁 Files Created
You now have the following files ready to use:
1. Global Styles (Put in src/styles/)

variables.css - All design tokens (colors, spacing, etc.)
global.css - Base styles and utility classes

2. Common Components (Already in src/components/common/)

Button.jsx + Button.css 
Input.jsx + Input.css 
Card.jsx + Card.css 
Navbar.jsx + Navbar.css 
PageLayout.jsx + PageLayout.css 

3. Page Template

ExamplePage.jsx + ExamplePage.css - Template to copy for your pages


🚀 Setup Steps
Step 1: Move Files to Correct Locations
bash# In VS Code terminal, run these commands:

# Move global styles
mv styles_variables.css src/styles/variables.css
mv styles_global.css src/styles/global.css

# Move new components
mv components_Navbar.jsx src/components/common/Navbar.jsx
mv components_Navbar.css src/components/common/Navbar.css
mv components_PageLayout.jsx src/components/common/PageLayout.jsx
mv components_PageLayout.css src/components/common/PageLayout.css

# Move example template (for reference)
mkdir -p src/pages/examples
mv pages_ExamplePage.jsx src/pages/examples/ExamplePage.jsx
mv pages_ExamplePage.css src/pages/examples/ExamplePage.css
Step 2: Update Your main.jsx or App.jsx
jsx// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// IMPORT GLOBAL STYLES HERE (VERY IMPORTANT!)
import './styles/variables.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
Step 3: Install React Router (if not installed)
bashnpm install react-router-dom
Step 4: Setup Routes in App.jsx
jsx// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import pages as team creates them
// import LoginPage from './pages/auth/LoginPage';
// import DashboardPage from './pages/dashboard/DashboardPage';
// etc...

// Temporary example import
import ExamplePage from './pages/examples/ExamplePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Example route */}
        <Route path="/" element={<ExamplePage />} />
        
        {/* Add your routes here as pages are created */}
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
        {/* <Route path="/upload" element={<UploadPage />} /> */}
        {/* <Route path="/history" element={<PastSuggestionsPage />} /> */}
        {/* <Route path="/analysis" element={<AnalysisPage />} /> */}
        {/* <Route path="/suggestions" element={<SuggestionsPage />} /> */}
        {/* <Route path="/report" element={<FinalReportPage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;

👥 For Team Members: How to Create Your Pages
Template to Follow:

Copy the example template:

bash   cp src/pages/examples/ExamplePage.jsx src/pages/your-folder/YourPage.jsx
   cp src/pages/examples/ExamplePage.css src/pages/your-folder/YourPage.css

Update the component name and imports
Use the PageLayout wrapper:

jsx   import PageLayout from '../../components/common/PageLayout';
   
   const YourPage = () => {
     return (
       <PageLayout title="Your Title" subtitle="Your subtitle">
         {/* Your content here */}
       </PageLayout>
     );
   };
Example: Keda's Login Page
jsx// src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    // Login logic here
    navigate('/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Welcome to EnviroSync</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            error={errors.email}
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            error={errors.password}
          />
          
          <Button type="submit" fullWidth>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
css/* src/pages/auth/LoginPage.css */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-green) 100%);
}

.login-card {
  background: var(--background-white);
  padding: var(--spacing-8);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  width: 100%;
  max-width: 450px;
}

.login-card h1 {
  text-align: center;
  margin-bottom: var(--spacing-8);
  color: var(--text-primary);
}

🎨 Using Design System
Colors
css/* Use CSS variables instead of hardcoded colors */
.my-element {
  background-color: var(--primary-blue);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}
Spacing
css.my-element {
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  gap: var(--spacing-3);
}
Typography
css.my-heading {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.my-text {
  font-size: var(--text-base);
  color: var(--text-secondary);
}
Using Utility Classes
jsx// Instead of writing custom CSS:
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-md">
  <span className="text-primary font-semibold">Hello</span>
</div>

📦 Common Components Usage
Button
jsximport Button from '../../components/common/Button';

<Button variant="primary" onClick={handleClick}>
  Primary Button
</Button>

<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="danger">Danger</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
Input
jsximport Input from '../../components/common/Input';

<Input
  label="Email"
  type="email"
  name="email"
  value={email}
  onChange={handleChange}
  error={errorMessage}
  placeholder="Enter your email"
  required
/>
Card
jsximport Card from '../../components/common/Card';

<Card title="Card Title">
  <p>Your content here</p>
</Card>

<Card className="custom-class">
  <p>Card without title</p>
</Card>
PageLayout
jsximport PageLayout from '../../components/common/PageLayout';

<PageLayout 
  title="Dashboard" 
  subtitle="Welcome back!"
  showNavbar={true}
  maxWidth="1280px"
>
  {/* Your page content */}
</PageLayout>

📊 Common Patterns
Stats Cards Grid
jsx<div className="stats-grid">
  <Card className="stat-card">
    <div className="stat-icon">📊</div>
    <h3 className="stat-value">42,850</h3>
    <p className="stat-label">Total CO2e</p>
  </Card>
  {/* More cards... */}
</div>
Data Table
jsx<Card title="Materials">
  <div className="table-container">
    <table className="data-table">
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Data 1</td>
          <td>Data 2</td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>
Empty State
jsx<Card className="empty-state">
  <div className="empty-icon">📭</div>
  <h3>No Data Available</h3>
  <p>Get started by uploading your first document</p>
  <Button variant="primary">Upload Document</Button>
</Card>
Loading State
jsx{isLoading ? (
  <div className="flex justify-center p-8">
    <div className="spinner"></div>
  </div>
) : (
  <YourContent />
)}

✅ Checklist Before Committing

 Imported global styles in main.jsx
 Used CSS variables (not hardcoded colors)
 Used common components (Button, Input, Card)
 Wrapped page in PageLayout (if applicable)
 Responsive design tested (1366x768 minimum)
 No console errors
 Followed naming conventions
 Added comments for complex logic


🆘 Common Issues & Solutions
Issue 1: "Cannot find module"
bash# Make sure you're importing correctly:
import Button from '../../components/common/Button';
# Check the path is correct relative to your file
Issue 2: "Styles not applying"
bash# Make sure variables.css and global.css are imported in main.jsx
# Check if CSS file is imported in your component
import './YourPage.css';
Issue 3: "React Router not working"
bash# Install if not installed:
npm install react-router-dom

# Make sure App.jsx wraps everything in <Router>

📞 Need Help?

Check the ExamplePage.jsx for reference
Look at common components code
Ask in team chat
Create GitLab issue with question label