var mvnAlgoliaPrediction = (function($) {
	var algolia;
	var that;
	var algoliaQueries = [];
	var self = {
		initialize: function() {
			that = this;
			if (typeof AlgoliaSearch !== "undefined") {
				this.initAlgolia();
			}
		},
		initAlgolia: function() {
			algolia = new AlgoliaSearch( mvnAlgSettings.appId, mvnAlgSettings.apiKeySearch ); // public credentials
		},
		indexTaxonomies: function() {
			if( typeof mvnAlgSettings.indexTaxonomies !== 'undefined' 
					&& parseInt( mvnAlgSettings.indexTaxonomies ) === 1 
					&& typeof mvnAlgSettings.taxonomiesToIndex !== 'undefined'
					&& mvnAlgSettings.taxonomiesToIndex ){
				return true;
			}
			return false;
		},
		searchCallback: function(success, content, response) {
			var data = [];
			var resultIndex = jQuery.inArray( 'posts', algoliaQueries );
			if ( success && content.results.length > 0 && that.lastQuery === content.results[resultIndex].query ) { // do not consider outdated answers
				var posts = content.results[resultIndex];
				if( posts.hits.length > 0 ){
					for (var i = 0; i < posts.hits.length; ++i) {
						var hit = posts.hits[i];
						var hitInfo = {
									label: hit.title,
									value: hit.title,
									title: (hit._highlightResult.title && hit._highlightResult.title.value) || hit.title,
									permalink: hit.permalink,
									categories: hit.category,
									tags: hit._tags,
									excerpt: (hit._highlightResult.excerpt && hit._highlightResult.excerpt.value) || hit.excerpt,
									description: (hit._highlightResult.content && hit._highlightResult.content.value) || hit.content,
									date: hit.date,
									featuredImage: hit.featuredImage,
									category: (mvnAlgSettings.labels.posts) ? mvnAlgSettings.labels.posts : ''   // Posts LABEL
									};
						data.push( hitInfo );
					}
				}
			}
			if( self.indexTaxonomies() ){
				jQuery.each(mvnAlgSettings.taxonomiesToIndex, function(index, element){
					resultIndex = jQuery.inArray( index, algoliaQueries );
					var terms = content.results[resultIndex];
					if( terms.hits.length > 0 ){
						for (var i = 0; i < terms.hits.length; ++i) {
							var hit = terms.hits[i];
							var hitInfo = {
										label: hit.title,
										value: hit.objectID,
										title: (hit._highlightResult.title && hit._highlightResult.title.value) || hit.title,
										permalink: hit.permalink,
										featuredImage: hit.image,									
										termId: hit.termId,
										parent: hit.parent,
										postsRelated: hit.postsRelated,
										taxonomy: hit.taxonomy,
										category: (mvnAlgSettings.labels.taxonomies[index]) ? mvnAlgSettings.labels.taxonomies[index] : ''   // TAXONOMY LABEL
										};
							data.push( hitInfo );
						}
					}
				});
			}
			response(data);
		},
		getDisplayPost: function( hit ) {
			var htmlPost = '';
			htmlPost += '			<a href="' + hit.permalink + '" class="mvn-alg-ls-item-title">';
			if( typeof hit.featuredImage !== 'undefined' && hit.featuredImage ){
				html += '	<img src="'+hit.featuredImage.file+'" width="40" height="60" />';
			}
			htmlPost += '				<strong>' + hit.title + '</strong>';

			if( typeof hit.categories !== 'undefined' ){
				htmlPost += '			<br /><span class="mvn-alg-ls-item-cats">' + hit.categories.join() + '</span>';
			}
			if( mvnAlgSettings.showExcerpt && typeof hit.excerpt !== 'undefined' && hit.excerpt ){
				htmlPost += '			<br /><span class="mvn-alg-ls-item-desc">' + hit.excerpt + '</span>';
			}
			htmlPost += '			</a>';
			return htmlPost;
		},
		getDisplayTerm: function( hit ) {
			var html = '';
			html += '<a href="' + hit.permalink + '" class="mvn-alg-ls-item-title">';
			if( typeof hit.featuredImage !== 'undefined' && hit.featuredImage ){
				html += '	<img src="'+hit.featuredImage+'" width="40" height="60" />';
			}
			html += '		<strong>' + hit.title + '</strong>';
			html += '</a>';
			return html;
		},
		search: function( request, response ) {
			if( typeof algolia !== 'undefined' ){
				algoliaQueries = [];
				algolia.startQueriesBatch();
				
				algolia.addQueryInBatch( mvnAlgSettings.indexName, request.term, {
					attributesToRetrieve: ['objectID', 'title', 'permalink', 'excerpt', 'content', 'date', 'featuredImage' , 'category', '_tags'],
					hitsPerPage: mvnAlgSearchVars.postsPerPage
				});
				algoliaQueries.push( 'posts' );
				
				if( self.indexTaxonomies() ){
					jQuery.each(mvnAlgSettings.taxonomiesToIndex, function(index, element){
						if( typeof element.indexName !== 'undefined' && element.indexName ){
							algolia.addQueryInBatch( element.indexName, request.term, {
								hitsPerPage: mvnAlgSearchVars.postsPerPage
							});
							algoliaQueries.push( index );
						}
					});
				}
				
				algolia.sendQueriesBatch(function(success, content) {
					// forward 'response' to Algolia's callback in order to call it with up-to-date results
					that.lastQuery = request.term;
					that.searchCallback(success, content, response);
				});
			}
		}
	};
	return self;
})(jQuery);

jQuery(document).ready(function($) {
	mvnAlgoliaPrediction.initialize();
	// The autocomplete function is called on the input textbox with id input_element
	$("input[name='" + mvnAlgSearchVars.inputSearchName + "']").each(function(index){
			$(this).autocomplete({
			// minLength is the minimal number of input characters before starting showing
			// the autocomplete
			minLength: 1,
			source: mvnAlgoliaPrediction.search,
			// This function is executed when a suggestion is selected
			select: function(event, ui) {
			  // Sets the text of the input textbox to the title of the object referenced
			  // by the selected list item
			  $(this).val(ui.item.label);
			  return false;
			}
		  // Here we alter the standard behavior when rendering items in the list
		  });
		$(this).autocomplete().data("ui-autocomplete")._renderItem = function(ul, item) {
			// ul is the unordered suggestion list
			// item is a object in the data object that was send to the response function
			// after the JSON request
			// We append a custom formatted list item to the suggestion list
			var itemHtml = '';
			if( typeof item.taxonomy !== 'undefined' ){
				itemHtml = mvnAlgoliaPrediction.getDisplayTerm(item);
			}else{
				itemHtml = mvnAlgoliaPrediction.getDisplayPost(item);
			}
			return $("<li></li>").data("item.autocomplete", item).append(itemHtml).appendTo(ul);
		};
		// Render menu just if index taxonomies is enabled
		if( typeof mvnAlgSettings.indexTaxonomies !== 'undefined' && mvnAlgSettings.indexTaxonomies > 0 && typeof mvnAlgSettings.taxonomiesToIndex !== 'undefined' ){
			
			$(this).autocomplete().data("ui-autocomplete")._renderMenu = function(ul, items) {
				var that = this,
				currentCategory = "";
				$.each(items, function(index, item) {
					if ( item.category && item.category !== currentCategory) {
						ul.append("<li class='ui-autocomplete-category'><span>" + item.category + "</span></li>");
						currentCategory = item.category;
					}
					that._renderItemData(ul, item);
				});
			};
		}
	});
});