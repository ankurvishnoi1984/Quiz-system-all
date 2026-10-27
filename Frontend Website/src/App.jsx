import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MarketingLayout from './layouts/MarketingLayout'
import HomePage from './pages/HomePage'
import FeaturesPage from './pages/FeaturesPage'
import PricingPage from './pages/PricingPage'
import RegisterPage from './pages/RegisterPage'
import RenewPage from './pages/RenewPage'
import AboutPage from './pages/AboutPage'
import UseCasesPage from './pages/UseCasesPage'
import StoriesPage from './pages/StoriesPage'
import ResourcesPage from './pages/ResourcesPage'
import ContactPage from './pages/ContactPage'
import HowItWorksPage from './pages/HowItWorksPage'
import ProductTourPage from './pages/ProductTourPage'
import SecurityPage from './pages/SecurityPage'
import IntegrationsPage from './pages/IntegrationsPage'
import SolutionsPage from './pages/SolutionsPage'
import EnterprisePage from './pages/EnterprisePage'
import FaqPage from './pages/FaqPage'
import HelpPage from './pages/HelpPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/use-cases" element={<UseCasesPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/product-tour" element={<ProductTourPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/enterprise" element={<EnterprisePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/renew" element={<RenewPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
