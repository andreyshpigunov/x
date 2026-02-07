/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-nesting': {},
    'postcss-custom-media': {},
    'postcss-extend': {},
    'postcss-for': {},
    'postcss-each': {},
    'postcss-lightningcss': {
      browsers: 'defaults',
      lightningcssOptions: {
        minify: true,
      },
    },
  },
};
