import React from 'react';

function App({ Component, pageProps }) {
    if (typeof document === 'undefined') { global.document = { querySelector: function () {}, }; }
    return <Component {...pageProps} />
}

export default App;