import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      
      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Last updated: January 27, 2026
              </p>
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Introduction</h2>
                <p className="text-muted-foreground mb-4">
                  At Data Whisperer, we take your privacy seriously. This Privacy Policy explains how we collect, 
                  use, disclose, and safeguard your information when you use our service.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
                <p className="text-muted-foreground mb-4">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Name and email address when you create an account</li>
                  <li>Payment information when you subscribe to a paid plan</li>
                  <li>Documents and data files you upload to our service</li>
                  <li>Communications you send to us</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">Usage Information</h3>
                <p className="text-muted-foreground mb-4">
                  We automatically collect certain information about your use of our service, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Device information and IP address</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent on pages</li>
                  <li>Actions taken within the service</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process your transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Detect, prevent, and address technical issues</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement appropriate technical and organizational measures to protect your personal information 
                  against unauthorized access, alteration, disclosure, or destruction. This includes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication</li>
                  <li>Secure data storage infrastructure</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your personal information for as long as necessary to provide our services and fulfill 
                  the purposes outlined in this Privacy Policy. When you delete your account, we will delete or 
                  anonymize your personal information, except where we are required to retain it for legal purposes.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Access and receive a copy of your personal information</li>
                  <li>Rectify inaccurate or incomplete information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to processing of your personal information</li>
                  <li>Request restriction of processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
                <p className="text-muted-foreground">
                  We may use third-party services to help us operate our service and administer activities on our 
                  behalf, such as payment processing, data storage, and analytics. These third parties have access 
                  to your information only to perform these tasks and are obligated not to disclose or use it for 
                  any other purpose.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                  the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review 
                  this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p className="text-muted-foreground mt-4">
                  Email: privacy@datawhisperer.com<br />
                  Address: 123 Data Street, Tech City, TC 12345
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
