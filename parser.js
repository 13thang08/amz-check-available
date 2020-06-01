/**
 * @Author: Mohammad M. AlBanna
 * Copyright © 2018 Jungle Scout
 * 
 * Parse the content of Amazon pages
 */
 

var Parser = function(data){
	mostPopularRegex = /(best\-?sellers)|(new\-?releases)|(movers\-?and\-?shakers)|(top\-?rated)|(most\-?wished\-?for)|(most\-?gifted)/i;
	bestSellerRegx = /(best\-?sellers)/i;
	newReleasesRegx = /(new\-?releases)/i;
	moversAndShakersRegx = /(movers\-?and\-?shakers)/i;
	topRatedRegx = /(top\-?rated)/i;
	mostWishesRegx = /(most\-?wished\-?for)/i;
	mostGiftedRegx = /(most\-?gifted)/i;
	brandRegex = /(by|from)\s[\u00BF-\u1FFF\u2C00-\uD7FF\w|\s][^\n|\r|\t]+/i;
	priceRegex = /(\$|\€|\£|\₹\s?|CDN\$\s|EUR\s)?[0-9(\s|&nbsp;)?]+[,.]+[0-9]+/i; //Check always filter.js
	currencyRegex = /(\$|\€|\£|\₹\s?|CDN\$\s|EUR\s)/i; //Check always filter.js
	asinRegex = /(dp|product|asin)?\/[0-9A-Z]{10}/;
	shopPages = /pages\/[0-9A-Z]{10}/;
	generalSearchRegex = /(field\-keywords)/i;
	thousandSeparatorRegex = /(\d+)[\,\.](?=\d{3}(\D|$))/g;//Get thousand separator on Germany and French Store
	wishListInfRegex = /(hz\/wishlist\/inf)/i;
	wishListLsRegex = /(hz\/wishlist\/ls)/i;
	storeFrontRegex = /(stores\/node\/[0-9])/i;
	buyingGuideRegex = /(vs\/buying-guide\/)/i;

	var isAvailable = function() {
		if ($(data, "body").find("#outOfStock").text()) {
			return false;
		} else {
			return true;
		}
	}

	//----------------------------------------------------//
	//Product Title
	var getProductTitle = function(){
		var productTitle = $(data, "body").find("#productTitle").text() || 
		$(data, "body").find("#btAsinTitle").text() || $(data, "body").find("#aiv-content-title").text() || 
		$(data, "body").find("#title_feature_div").text() || $(data, "body").find(".AAG_ProductTitle a").attr("title")
		|| $(data, "body").find("#item_name").text() || $(data, "body").find("#ebooksProductTitle").text() || $(data, "body").find("#mediaProductTitle").text();

		if(productTitle){
			productTitle = productTitle.trim();
			productTitle = productTitle.length == 0 ? "N.A." : productTitle;
		}else{
			productTitle = "N.A.";
		}
		return productTitle;
	}
	//----------------------------------------------------//
	//Brand
	var getBrand = function(passingData){
		var brand = null;
		if(typeof passingData != "undefined" && typeof passingData.brand != "undefined" && passingData.brand != null){
			brand = passingData.brand;
		}else{
			brand = $(data, "body").find("#brand").text() || $(data, "body").find("#bylineInfo").text() || $(data, "body").find("span.author a").filter(":first").text() || 
			$(data, "body").find("#product-title_feature_div").text().match(brandRegex) || $(data, "body").find(".parseasinTitle").siblings("span").last().text().match(brandRegex)
			|| $(data, "body").find("#olpProductByline").text().match(brandRegex) || $(data, "body").find("#brandByline_feature_div").text().match(brandRegex)
			|| $(data, "body").find("#brandBylineWrapper").text().match(brandRegex) || $(data, "body").find("#mocaBBSoldByAndShipsFrom a").text()
			|| $(data, "body").find("#byline a").filter(":first").text() || $(data, "body").find("#bylineInfo_feature_div").text();
		}

        if(brand){
        	brand = typeof brand == "object" ? brand[0].replace(/by\s?/,"") : brand.replace(/by\s?/,"");
        	brand = brand.trim();
			brand = brand.length == 0 ? "N.A." : brand;
        }else{
        	brand = "N.A.";
        }

        return brand;
	}
	//----------------------------------------------------//
	//BB seller
	var getBbSeller = function(){
		var merchantInfo = $(data, "body").find("#merchant-info").text().trim() || $(data, "body").find("#mocaBBSoldByAndShipsFrom").text().trim() || 
		$(data, "body").find("table .buying").text().trim() || ($theCurrentMBC = $(data, "body").find("#moreBuyingChoices_feature_div .mbc-offer-row"), $theCurrentMBC.length == 1 ? $theCurrentMBC.text().trim() : "");
      
      	var amzRegex = /((ships|dispatched)\s+from\s+and\s+sold\s+by\s+amazon)|(sold\s+by:\s+amazon)|(Expédié\s+et\s+vendu\s+par\s+Amazon)|(Verkauf\s+und\s+Versand\s+durch\s+Amazon)|(Vendido\s+y\s+enviado\s+por\s+Amazon)|(Venduto\s+e\s+spedito\s+da\s+Amazon)/i;
      	var amz = amzRegex.test(merchantInfo);

      	var fbaRegex = /(fulfilled\s+by\s+amazon)|(sold\s+by:)|(expédié\s+par\s+amazon)|(Versand\s+durch\s+Amazon)|(enviado\s+por\s+Amazon)|(gestionado\s+por\s+Amazon)|(spedito\s+da\s+Amazon)/i;
      	var fba = fbaRegex.test(merchantInfo);

      	var merchRegex = /((ships|dispatched)\s+from\s+and\s+sold\s+by)|(Expédié\s+et\s+vendu\s+par)|(Verkauf\s+und\s+Versand\s+durch)|(Vendido\s+y\s+enviado\s+por)|(Venduto\s+e\s+spedito\s+da)/i;
      	var merch = merchRegex.test(merchantInfo);

      	var bbSeller = "N.A.";

      	if(amz){
      		bbSeller = "AMZ";
      	}else if(fba){
      		bbSeller = "FBA";
      	}else if(merch){
      		bbSeller = "FBM";
      	}

      	return bbSeller;
	}
	//----------------------------------------------------//
	//Get Price
	var getPrice = function(passingData){
      	var price = $(data, "body").find("#actualPriceValue").text() || $(data, "body").find("#priceblock_ourprice").text() || 
      	$(data, "body").find("#priceblock_saleprice").text() || $(data, "body").find("#priceblock_dealprice").text() || $(data, "body").find("#priceBlock .priceLarge").text() || 
      	$(data, "body").find("#buyNewSection .a-color-price.offer-price").text() || $(data, "body").find("#prerderDelaySection .a-color-price").text() || 
      	$(data, "body").find("#mocaSubtotal .a-color-price").text() || $(data, "body").find("#tmmSwatches .a-color-price").text() || 
      	$(data, "body").find("#mediaTab_content_landing .a-color-price.header-price").text() || $(data, "body").find("#unqualifiedBuyBox .a-color-price").text() || 
      	$(data, "body").find("#mediaTab_content_landing .a-color-price").text() || $(data, "body").find("#wineTotalPrice").text() 
      	|| $(data, "body").find("#buybox_feature_div .a-color-price").text() || $(data, "body").find("#moreBuyingChoices_feature_div .a-color-price").text() || 
      	$(data, "body").find("#olp_feature_div a").filter(":first").text();

var priceRegex = /(\$|\€|\£|\₹\s?|CDN\$\s|EUR\s)?[0-9(\s|&nbsp;)?]+[,.]+[0-9]+/i; //Check always filter.js
      	price = price.match(priceRegex) ? price.match(priceRegex)[0] : null;
  		if(price){
  			//Take it just a number > //Remove all spaces between numbers > //remove any thousand separator > //Because of Germany and French stores
  			price = price.replace(currencyRegex,"").replace(/(\s|&nbsp;)/g,"").replace(thousandSeparatorRegex,"$1").replace(",","."); 
  		} else {
  			//Try to see if it's separated price
  			price = $(data, "body").find("#newPrice #priceblock_ourprice .buyingPrice, #newPrice #priceblock_ourprice .priceToPayPadding, #usedPrice #priceblock_usedprice .buyingPrice, #usedPrice #priceblock_usedprice .priceToPayPadding").map(function(){
						return jQuery(this).text();
					}).get().join(".").replace(/^[.]+/,'');
  			price = !price ? "N.A." : parseFloat(price).toFixed(2);
  		}

      	if(price == "N.A." && typeof passingData != "undefined" && typeof passingData.price != "undefined"){
      		price = passingData.price;
      	}

      	return price;
	}
	//----------------------------------------------------//
	//Check if this product has prime delivery
	var isPrime = function (passingData){
		if(typeof passingData != "undefined" && passingData.isPrime != "undefined" && passingData.isPrime) return true;
		return $(data, "body").find("#ourprice_shippingmessage i.a-icon-prime").length > 0 ? true : false;
	}
	//----------------------------------------------------//
	//Get Product Image
	var getProductImage = function(){
		var productImage = $(data, "body").find("#landingImage, #imgBlkFront").attr("data-a-dynamic-image");
      	if(productImage){
      		productImage = JSON.parse(productImage);
      		productImage = Object.keys(productImage)[0] ? Object.keys(productImage)[0].trim() : null;
      	}else{
      		//Check main image src
      		productImage = $(data, "body").find("#main-image, #ebooks-img-canvas img").attr("src");
      		if(!productImage){
      			productImage = null;
      		}
      	}
      	return productImage;
	}
	//----------------------------------------------------//
	//Get rank category
	var getRankAndCategory = function(bestSellerRankText){
		var rankAndCategory = $(data, "body").find("#SalesRank").clone().find("ul,style,li").remove().end().text() || 
		$(data,"body").find("#prodDetails th:contains('"+bestSellerRankText+"')").next().find("br~span").remove().end().text();
		
		//Get the category
		var category = rankAndCategory ? (rankAndCategory = rankAndCategory.replace(bestSellerRankText,'') , rankAndCategory.match(/(in\s|en\s)[\s\u00BF-\u1FFF\u2C00-\uD7FF\w\&\,\-]+[\(\>]?/gi)) : null;
		category = category ? category[0] : null ;
  		if(category && category.indexOf(">") == -1){
  			category = category.replace(/^(in|en)|(\()/g,"");
      	}else{
      		category = "N.A.";
      	}

      	//Get the rank
      	var rank = rankAndCategory ? rankAndCategory.match(/((\#)|(Nr.\s)|(nº)|(n.\s?))?[0-9,.]+|(\>)/gi) : null;
  		if(rank && $.inArray(">", rank) == -1){
  			rank = rank[0].replace(/(\#)|(Nr.)|(\,)|(\.)|(nº)|(n.)/gi,"");
  		}else{
  			rank = "N.A.";
  		}
      	return {category:category.trim(), rank:rank.trim()};
	}
	//----------------------------------------------------//
	//Get rating
	var getRating = function(){
  		var rating = $(data, "body").find("#averageCustomerReviews .a-icon-star").attr("class") || 
  		$(data, "body").find("span.asinReviewsSummary .swSprite").attr("class") || 
  		$(data, "body").find("#reviewStars").attr("class");
		if(rating){
		  rating = rating.match(/[1-9]/g);
		  rating = rating[1] ? rating[0] + "." + rating[1] : rating[0];
		}else{
			rating = "N.A.";
		}
      	return rating;
	}
	//----------------------------------------------------//
	//Get reviews
	var getReviews = function(){
		var reviews =  $(data, "body").find("#acrCustomerWriteReviewLink").filter(":first").text() || $(data, "body").find("#acrCustomerReviewText").filter(":first").text() || 
		$(data, "body").find("#reviewLink").filter(":first").text() || $(data, "body").find("span.asinReviewsSummary").filter(":first").next().text();
	
		reviews = reviews && reviews.match(/[0-9.,]+/) ? reviews.match(/[0-9.,]+/)[0] : "0";
		reviews = reviews ? reviews.replace(/[\,\.]/,"") : "0"; //Because of Germany and French stores

		return reviews.trim();
	}

	var getSellerCount = function() {
		var sellerCount = $(data, "body").find('#olp_feature_div').text();
		debugger;
		sellerCount = sellerCount && sellerCount.match(/[0-9.,]+/) ? sellerCount.match(/[0-9.,]+/)[0] : "0";
		sellerCount = sellerCount ? sellerCount.replace(/[\,\.]/,"") : "0"; //Because of Germany and French stores

		return sellerCount.trim();
	}

	var getDateFirstAvailable = function() {
		debugger;
		let dateFirstAvailable = '';
		$(data).find("#productDetails_detailBullets_sections1 tr th").each(function() {
			if ($(this).text().toLowerCase().includes("date first")) {
				dateFirstAvailable = $(this).next().text().trim();
			}
		})

		return Date.parse(dateFirstAvailable)
	}

	var getShippingWeight = function() {
		let weight = 0;
		$(data).find("#detail-bullets").find('li').each(function() {
			let string = $(this).text();
			let tmpWeight = getWeight(string);
			if (tmpWeight > 0) {
				weight = tmpWeight;
			}
		}) 

		$(data).find("#productDetails_feature_div").find('td').each(function() {
			let string = $(this).text();
			let tmpWeight = getWeight(string);
			if (tmpWeight > 0) {
				weight = tmpWeight;
			}
		})

		return weight;
	}

	function getWeight(string) {
		let NUMERIC_REGEXP = /[-]{0,1}[\d]*[\.]{0,1}[\d]+/g;
		let arr = string.match(NUMERIC_REGEXP);
		let weight = 0;
		if (Array.isArray(arr) && arr.length > 0) {
			weight = arr[arr.length - 1];
		}
		let factor = 0;
		if (string.indexOf('ounces') !== -1) {
			factor = 0.02834952
		}
		if (string.indexOf('pounds') !== -1) {
			factor = 0.45359237
		}
		
		return weight * factor
	}

	//----------------------------------------------------//
	//Return
	return {
		isAvailable:isAvailable,
		getProductTitle:getProductTitle,
		getBrand:getBrand,
		getBbSeller:getBbSeller,
		getSellerCount: getSellerCount,
		getPrice:getPrice,
		isPrime:isPrime,
		getProductImage:getProductImage,
		getRankAndCategory:getRankAndCategory,
		getRating:getRating,
		getReviews:getReviews,
		getDateFirstAvailable: getDateFirstAvailable,
		getShippingWeight: getShippingWeight,
	}
}

module.exports = Parser