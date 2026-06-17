import React from 'react';
import Header from './Header';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <p className="text-gray-500 text-center">
          Select an option above to get started.
        </p>
      </main>
    </div>
  );
};

export default App;