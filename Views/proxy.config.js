// // https://angular.io/guide/build#proxying-to-a-backend-server

// const PROXY_CONFIG = {
//   '/users/**': {
//     target: 'https://api.github.com',
//     changeOrigin: true,
//     secure: false,
//     logLevel: 'debug',
//     // onProxyReq: (proxyReq, req, res) => {
//     //   const cookieMap = {
//     //     SID: '',
//     //   };
//     //   let cookie = '';
//     //   for (const key of Object.keys(cookieMap)) {
//     //     cookie += `${key}=${cookieMap[key]}; `;
//     //   }
//     //   proxyReq.setHeader('cookie', cookie);
//     // },
//   },
// };

// module.exports = PROXY_CONFIG;


const PROXY_CONFIG = {
  // Proxy pour l'API principale
  '/api/**': {
    target: 'http://server:3000',  // backend Node.js
    changeOrigin: true,
    secure: false,
    logLevel: 'debug'
  },
  // Proxy pour le dossier chargements
  '/chargements/**': {
    target: 'http://server:3000',  // backend Node.js
    changeOrigin: true,
    secure: false,
    logLevel: 'debug'
  }
};

module.exports = PROXY_CONFIG;
