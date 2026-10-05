import { TestIR, UIElementModel } from '../types/testAutomation';

export const SAMPLE_TEST_IR: TestIR = {
  id: 'ir-login-001',
  testCaseId: 'TC_AUTH_001',
  title: 'Standard User Authentication Flow',
  description: 'Verify that a standard user can successfully log into the portal with valid credentials and reach the primary dashboard.',
  feature: 'Authentication',
  sprint: 'Sprint 24',
  priority: 'P0',
  baseUrl: 'https://demo-shop.autotest.io',
  preconditions: [
    'User account exists with username: test_qa_user',
    'Application is accessible over HTTPS'
  ],
  postconditions: [
    'Session cookie is established',
    'Dashboard metrics are rendered'
  ],
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      action: 'navigate',
      description: 'Navigate to application login page',
      value: '/login'
    },
    {
      id: 'step-2',
      stepNumber: 2,
      action: 'fill',
      description: 'Enter username into account field',
      target: {
        semantic: 'Username input field',
        role: 'textbox',
        recommendedLocator: "input[data-testid='username-input']",
        locators: [
          { strategy: 'testid', selector: "input[data-testid='username-input']", confidence: 0.99 },
          { strategy: 'role', selector: "getByRole('textbox', { name: 'Username' })", confidence: 0.95 },
          { strategy: 'css', selector: "#username", confidence: 0.88 }
        ]
      },
      value: 'qa_engineer@enterprise.com'
    },
    {
      id: 'step-3',
      stepNumber: 3,
      action: 'fill',
      description: 'Enter password into secure secret field',
      target: {
        semantic: 'Password input field',
        role: 'textbox',
        recommendedLocator: "input[data-testid='password-input']",
        locators: [
          { strategy: 'testid', selector: "input[data-testid='password-input']", confidence: 0.99 },
          { strategy: 'role', selector: "getByRole('textbox', { name: 'Password' })", confidence: 0.94 },
          { strategy: 'css', selector: "input[type='password']", confidence: 0.91 }
        ]
      },
      value: 'SecurePass2026!'
    },
    {
      id: 'step-4',
      stepNumber: 4,
      action: 'click',
      description: 'Click primary submit button to execute sign in',
      target: {
        semantic: 'Login submit button',
        role: 'button',
        recommendedLocator: "button[data-testid='login-submit-btn']",
        locators: [
          { strategy: 'testid', selector: "button[data-testid='login-submit-btn']", confidence: 0.98 },
          { strategy: 'role', selector: "getByRole('button', { name: 'Sign In' })", confidence: 0.96 },
          { strategy: 'css', selector: "button.primary-action-btn", confidence: 0.84 }
        ]
      }
    },
    {
      id: 'step-5',
      stepNumber: 5,
      action: 'assert_visible',
      description: 'Verify dashboard navigation bar and welcome banner is visible',
      target: {
        semantic: 'Dashboard welcome banner',
        role: 'heading',
        recommendedLocator: "[data-testid='dashboard-welcome-banner']",
        locators: [
          { strategy: 'testid', selector: "[data-testid='dashboard-welcome-banner']", confidence: 0.97 },
          { strategy: 'role', selector: "getByRole('heading', { name: 'Welcome back' })", confidence: 0.93 }
        ]
      },
      expectedResult: 'Welcome back, QA Engineer'
    }
  ]
};

export const SAMPLE_UI_GRAPH: UIElementModel[] = [
  {
    semanticId: 'auth.login.username',
    businessName: 'Username Input Field',
    page: '/login',
    role: 'textbox',
    primaryLocator: "input[data-testid='username-input']",
    fallbackLocators: ["#username", "getByRole('textbox', { name: 'Username' })"],
    currentText: '',
    lastUpdatedSprint: 'Sprint 24'
  },
  {
    semanticId: 'auth.login.password',
    businessName: 'Password Input Field',
    page: '/login',
    role: 'textbox',
    primaryLocator: "input[data-testid='password-input']",
    fallbackLocators: ["#password", "input[type='password']"],
    currentText: '',
    lastUpdatedSprint: 'Sprint 24'
  },
  {
    semanticId: 'auth.login.submit',
    businessName: 'Submit Credentials Button',
    page: '/login',
    role: 'button',
    primaryLocator: "button[data-testid='login-submit-btn']",
    fallbackLocators: ["#login-button", "button:has-text('Sign In')"],
    currentText: 'Sign In',
    lastUpdatedSprint: 'Sprint 24'
  },
  {
    semanticId: 'dashboard.header.welcome',
    businessName: 'Dashboard Welcome Header',
    page: '/dashboard',
    role: 'heading',
    primaryLocator: "[data-testid='dashboard-welcome-banner']",
    fallbackLocators: ["h1.dashboard-title", "getByRole('heading', { name: 'Welcome back' })"],
    currentText: 'Welcome back',
    lastUpdatedSprint: 'Sprint 24'
  }
];

export const PRESET_TEST_SHEETS = [
  {
    id: 'ecom-checkout',
    name: 'E-Commerce: Cart to Checkout Flow',
    feature: 'E-Commerce Checkout',
    baseUrl: 'https://demo-ecommerce.autotest.io',
    stepsText: `Test Case: TC_CHECKOUT_004 - Guest Checkout with Credit Card
Step 1: Open store catalog page at /products
Step 2: Click on item card "Wireless Noise Cancelling Headphones"
Step 3: Click "Add to Cart" button (data-testid: add-to-cart)
Step 4: Click Shopping Cart header icon to open drawer
Step 5: Click "Proceed to Checkout" button
Step 6: Fill Shipping Address: "100 Market St, San Francisco, CA"
Step 7: Click "Continue to Payment"
Step 8: Fill card number "4242424242424242"
Step 9: Click "Place Order" button
Step 10: Verify confirmation message "Order # confirmed!" is visible`
  },
  {
    id: 'crm-lead',
    name: 'CRM: Lead Creation & Assignment',
    feature: 'CRM Lead Management',
    baseUrl: 'https://sales-crm.enterprise.io',
    stepsText: `Test Case: TC_CRM_201 - Create and Assign New Sales Prospect
Step 1: Navigate to /leads/new
Step 2: Enter Lead Name "Acme Corp - Cloud Migration"
Step 3: Fill Estimated Deal Value "85000"
Step 4: Select Industry dropdown option "Technology & SaaS"
Step 5: Assign Lead Owner "Sarah Jenkins"
Step 6: Click "Create Lead" button
Step 7: Verify status badge displays "Open - Uncontacted"
Step 8: Assert URL redirects to /leads/view/*`
  },
  {
    id: 'banking-transfer',
    name: 'FinTech: Quick Wire Transfer Verification',
    feature: 'Banking Transfers',
    baseUrl: 'https://online.capital-bank.io',
    stepsText: `Test Case: TC_WIRE_102 - Intra-bank Account Transfer
Step 1: Open transfers portal at /transfer/funds
Step 2: Select source account "Checking (...4819)"
Step 3: Enter recipient routing number "021000021"
Step 4: Enter amount "450.00"
Step 5: Fill memo "Monthly office supplies"
Step 6: Click "Review Transfer" button
Step 7: Verify OTP modal appears with title "Two-Factor Verification"
Step 8: Enter OTP code "992144"
Step 9: Click "Authorize & Send"
Step 10: Assert confirmation text "Transfer of $450.00 submitted"`
  }
];
