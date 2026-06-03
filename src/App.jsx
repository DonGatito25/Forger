import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter, BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppSettingsProvider } from '@/components/app/AppSettingsProvider';
import PageNotFound from './lib/PageNotFound';
import Home from './pages/Home';
import Diagram from './pages/Diagram';
import Concepts from './pages/Concepts';
import Timeline from './pages/Timeline';
import Settings from './pages/Settings';

function App() {
  const Router = typeof window !== 'undefined' && window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppSettingsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diagram" element={<Diagram />} />
            <Route path="/concepts" element={<Concepts />} />
            <Route path="/timeline/:tabId" element={<Timeline />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AppSettingsProvider>
    </QueryClientProvider>
  )
}

export default App
