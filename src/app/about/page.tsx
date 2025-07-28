import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About Startup Success Stories
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Inspiring the next generation of entrepreneurs through real success stories
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-700 mb-6">
            We believe that success is contagious. Our mission is to inspire and educate aspiring entrepreneurs 
            by showcasing real success stories from recently founded startups that have achieved remarkable funding success.
          </p>
          <p className="text-lg text-gray-700">
            By focusing on startups founded within the last 5 years, we demonstrate that success is achievable 
            by regular people in today's rapidly evolving business landscape.
          </p>
        </div>

        {/* What We Do */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Discovery</h3>
            <p className="text-gray-700">
              Our advanced AI system continuously monitors thousands of startups, analyzing funding announcements, 
              growth metrics, and success indicators to identify the most inspiring stories.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Data-Driven Insights</h3>
            <p className="text-gray-700">
              We provide detailed analysis of success factors, funding patterns, and industry trends to help 
              entrepreneurs understand what drives startup success in the modern era.
            </p>
          </div>
        </div>

        {/* Why Recent Startups */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Focus on Recent Startups?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">🎯 Relevance</h4>
              <p className="text-gray-700">
                Stories from the last 5 years reflect current market conditions, technologies, and business models 
                that are relevant to today's entrepreneurs.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">💡 Inspiration</h4>
              <p className="text-gray-700">
                Seeing success from recent startups proves that extraordinary achievements are possible 
                by regular people in today's competitive landscape.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">📈 Learning</h4>
              <p className="text-gray-700">
                Recent success stories provide actionable insights and strategies that can be applied 
                to current entrepreneurial endeavors.
              </p>
            </div>
          </div>
        </div>

        {/* Our Criteria */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Selection Criteria</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                1
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Founded Within 5 Years</h4>
                <p className="text-gray-700">Only startups founded between 2020-2025 to ensure relevance and current applicability.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                2
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Significant Funding Success</h4>
                <p className="text-gray-700">Minimum $500,000 in funding to demonstrate market validation and investor confidence.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                3
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Verifiable Information</h4>
                <p className="text-gray-700">All stories must have credible sources, company websites, and verifiable funding announcements.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1">
                4
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Inspiring Journey</h4>
                <p className="text-gray-700">Stories that showcase innovation, perseverance, and strategic thinking that others can learn from.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Technology</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">🤖 AI Content Generation</h4>
              <p className="text-gray-700 mb-4">
                We use advanced AI models to analyze startup data and generate comprehensive, engaging success stories 
                that capture the essence of each company's journey.
              </p>
              <ul className="text-gray-700 space-y-2">
                <li>• Automated data collection from multiple sources</li>
                <li>• Intelligent story generation with human-like narrative</li>
                <li>• Quality validation and fact-checking</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">📡 Real-time Monitoring</h4>
              <p className="text-gray-700 mb-4">
                Our system continuously monitors funding announcements, news sources, and startup databases 
                to discover new success stories as they happen.
              </p>
              <ul className="text-gray-700 space-y-2">
                <li>• Automated data collection every 3 hours</li>
                <li>• Multiple source verification</li>
                <li>• Instant story generation and publication</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Get Inspired</h2>
          <p className="text-lg text-gray-700 mb-6">
            Ready to discover how regular people are building extraordinary companies? 
            Start exploring our collection of success stories today.
          </p>
          <a
            href="/stories"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
          >
            Explore Success Stories →
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
} 