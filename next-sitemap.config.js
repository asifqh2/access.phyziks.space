/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.phyziks.space',
  generateRobotsTxt: true,

  sitemapSize: 5000,
  changefreq: 'monthly',
  priority: 0.7,

  exclude: [
    '/search',
    '/analytics',
    '/create-post',
    '/create-quiz',
    '/admin',
    '/dashboard',
  ],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/search',
          '/analytics',
          '/create-post',
          '/create-quiz',
          '/admin',
        ],
      },
    ]
  },
};
