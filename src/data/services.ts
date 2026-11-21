export interface Service {
  slug: string;
  name: string;
  summary: string;
  deliverables: string[];
}

export const services: Service[] = [
  { slug: 'web-development', name: 'Website & Web Application Development', summary: 'Business websites and custom web applications, including WordPress.', deliverables: ['Website development', 'Web application development', 'WordPress development'] },
  { slug: 'mobile-development', name: 'Mobile Application Development', summary: 'Cross-platform and Android mobile applications.', deliverables: ['Flutter cross-platform apps', 'Android development'] },
  { slug: 'custom-software', name: 'Custom Software, ERP & CRM', summary: 'Software built or implemented around your business processes.', deliverables: ['Custom software development', 'ERP and CRM implementation'] },
  { slug: 'cloud-and-servers', name: 'Cloud Deployment & Linux Administration', summary: 'Reliable hosting, deployment and server administration.', deliverables: ['Cloud deployment', 'Linux server administration'] },
  { slug: 'integrations-automation', name: 'API Integration & Business Automation', summary: 'Connect your tools and automate repetitive work.', deliverables: ['API development and integration', 'Business process automation'] },
  { slug: 'support', name: 'Maintenance & Technical Support', summary: 'Ongoing care for the systems we build.', deliverables: ['Annual maintenance contracts', 'Monthly retainers', 'Technical support'] },
];

export const divisions = [
  { name: 'Technology Products & SaaS', text: 'Software-as-a-Service platforms, marketplaces and industry-specific applications.', href: '/products' },
  { name: 'IT Services & Digital Solutions', text: 'Websites, apps, custom software, cloud and automation for businesses.', href: '/services' },
  { name: 'Fintech & Financial Technology', text: 'Software infrastructure for financial workflows and business transactions.', href: '/fintech' },
];
