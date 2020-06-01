const puppeteer = require('puppeteer');
const Parser = require('./parser');
const fs = require('fs');
const axios = require('axios');
const config = require('./config');
const Json2csvParser = require('json2csv').Parser;
const promisify = require('util').promisify;
const appendFile = promisify(fs.appendFile);
const unlink = promisify(fs.unlink);
const endOfLine = require('os').EOL;
const { Observable } = require('rxjs');
const { retry } = require('rxjs/operators');

async function appendCsvFile(info) {
  let fields = Object.keys(info);
  const json2csvParser = new Json2csvParser({ fields, header: false });
  const csv = json2csvParser.parse([info]);
  await appendFile(config.outputProductsFile, `${endOfLine}`);
  await appendFile(config.outputProductsFile, csv);
}

async function main() {
  const browser = await puppeteer.launch({
    // headless: false,
  });
  const page = await browser.newPage();

  await page.addScriptTag({
    url: "https://code.jquery.com/jquery-3.2.1.min.js"
  });

  await page.addScriptTag({content: `var Parser = ${Parser}`});

  let inputs = fs.readFileSync(config.productsFile, 'UTF-8');
  let urls = inputs.split(/\r?\n/);

  try {
    await unlink(config.outputProductsFile);
  } catch(e) {

  }
  await appendFile(config.outputProductsFile, `"STT","Link Amz","ASIN","Trạng thái","Giá"`);
  
  for (let i = 0; i < urls.length; i++) {
    let url = urls[i];
    console.log(`getting data from url: ${url}`);
    let info = await getDetail(page, url);
    if (info) {
      await appendCsvFile({
        index: i + 1,
        link: url,
        asin: getAsin(url),
        status: info.isAvailable ? "Avaiable" : "Not available at the moment",
        price: info.price
      });
    }

  }

  console.log("DONE");
  process.exit();
}

async function getDetail(page, url) {
  try {
    let response = await getHtmlObservable(url).pipe(
      retry(30)
    ).toPromise();
    let productInfo = await page.evaluate(html => {
      var parser = new Parser(html);
      return {
          isAvailable: parser.isAvailable(),
          productName: parser.getProductTitle(), 
          brand: parser.getBrand(),
          price: parser.getPrice(),
          isPrime: parser.isPrime(),
          category: parser.getRankAndCategory("Best Sellers Rank").category,
          rank: parser.getRankAndCategory("Best Sellers Rank").rank,
          reviews: parser.getReviews(),
          rating: parser.getRating(),
          seller: parser.getBbSeller(),
          sellerCount: parser.getSellerCount(),
          dateFirstAvailable: parser.getDateFirstAvailable(),
          shippingWeight: parser.getShippingWeight(),
      };
    }, response);

    return productInfo;
  } catch(e) {
    console.log(`Error when processing: ${url}`)
  }
}

function getHtmlObservable(url) {
  return Observable.create( ( observer ) => {
    console.log(`Requesting...: ${url}`);
    axios.get(url)
    .then( ( response ) => {
      observer.next( response.data );
      observer.complete();
    } )
    .catch( ( error ) => {
      observer.error( error );
    } );
  });
}
function getAsin(string) {
  let ASIN_REGEXP = /(?:[/dp/]|$)([A-Z0-9]{10})/;
  let arr = string.match(ASIN_REGEXP);
  if (Array.isArray(arr) && arr.length > 0) {
    return arr[arr.length - 1];
  } else {
    return null
  }
}

main();