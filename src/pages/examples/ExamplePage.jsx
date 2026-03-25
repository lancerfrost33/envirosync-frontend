import React, { useState } from 'react';
import PageLayout from '../../components/common/PageLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import './ExamplePage.css';

const ExamplePage = () => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);

  // Handle actions
  const handleAction = () => {
    setIsLoading(true);
    // Your logic here
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <PageLayout
      title="Example Page Title"
      subtitle="This is an example subtitle describing what this page does"
      showNavbar={true}
      maxWidth="1280px"
    >
      {/* Page Content Starts Here */}
      
      {/* Example: Stats Cards Row */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-icon">📊</div>
          <h3 className="stat-value">42,850</h3>
          <p className="stat-label">Total CO2e Tracked</p>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-icon">📈</div>
          <h3 className="stat-value">18.5%</h3>
          <p className="stat-label">Reduction Achieved</p>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-icon">🌱</div>
          <h3 className="stat-value">1,240</h3>
          <p className="stat-label">Trees Equivalent</p>
        </Card>
      </div>

      {/* Example: Action Section */}
      <Card title="Actions" className="action-section">
        <div className="flex gap-4">
          <Button 
            variant="primary" 
            onClick={handleAction}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Primary Action'}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={handleAction}
          >
            Secondary Action
          </Button>
          
          <Button 
            variant="success" 
            onClick={handleAction}
          >
            Success Action
          </Button>
        </div>
      </Card>

      {/* Example: Data Table */}
      <Card title="Data Table Example">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>CO2 Emission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ready Mix Concrete</td>
                <td>100</td>
                <td>m³</td>
                <td>300 kg CO2e</td>
                <td><span className="badge badge-success">Low</span></td>
              </tr>
              <tr>
                <td>Structural Steel</td>
                <td>50</td>
                <td>t</td>
                <td>1,500 kg CO2e</td>
                <td><span className="badge badge-warning">Medium</span></td>
              </tr>
              <tr>
                <td>Glass Panels</td>
                <td>200</td>
                <td>m²</td>
                <td>800 kg CO2e</td>
                <td><span className="badge badge-danger">High</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Example: Empty State (when no data) */}
      {data.length === 0 && (
        <Card className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Data Available</h3>
          <p>Get started by uploading your first document</p>
          <Button variant="primary" onClick={handleAction}>
            Upload Document
          </Button>
        </Card>
      )}

    </PageLayout>
  );
};

export default ExamplePage;