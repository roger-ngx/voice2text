import React from 'react';
if (typeof document === 'undefined') { global.document = { querySelector: function () {}, }; }

function App({ Component, pageProps }) {
    return <Component {...pageProps} />
}

export default App;