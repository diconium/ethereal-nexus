import Document, { Html, Head, Main, NextScript } from "next/document";
import React from "react";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <meta name="robots" content="noindex" />
        </Head>
        <body className="bg-background-grey">
        <Main />
        <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
