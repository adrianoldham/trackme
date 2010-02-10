var TrackMe = Class.create({
    options: {
        pageIdMetaTagName: "page_id",                   // name of the meta tag to grab the page id from
        regions: "#main, #sidebar, #header, #footer",   // selector that defines which regions to include in the tracking id
        articleIdRegex: "^article_",                    // regex used to test for closest article_id
        anchorClicked: function(trackingId, event) {    // this function is called when an anchor is clicked (the tracking id is passed through)
            pageTracker._trackPageview(trackingId);
        },
        
        // array that specifies a list of regex to test 
        // on an anchors href to see if it shouldn't be tracked
        // - Only add regexes into the array if you want to use this feature
        hrefRegexes: []                                 
    },

    initialize: function(anchors, options) {        
        this.options = Object.extend(Object.extend({ }, this.options), options || { });
        
        // Find all the anchors we need to apply track me to
        this.anchors = $$(anchors);
        this.anchors.each(function(anchor) {
            this.apply(anchor);
        }.bind(this));
    },
    
    encodeURL: function(clearString) {
        var output = '';
        var x = 0;
        clearString = clearString.toString();
        var regex = /(^[a-zA-Z0-9_.]*)/;

        while (x < clearString.length) {
            var match = regex.exec(clearString.substr(x));
            if (match != null && match.length > 1 && match[1] != '') {
                output += match[1];
                x += match[1].length;
            } else {
                if (clearString[x] == ' ') output += '_';
                x++;
            }
        }

        return output;
    },
    
    findClosestBySelector: function(element, selector) {
        var ancestors = element.ancestors();
        var possibleMatches = $$(selector);
        
        // Find the closest parent that matches the given selector
        for (var i = 0; i < ancestors.length; i++) {
            var ancestor = ancestors[i];
            if (possibleMatches.indexOf(ancestor) != -1) {
                return ancestor;
            }
        }
        
        return null;
    },
    
    findClosestByRegex: function(element, regex) {
        var ancestors = element.ancestors();
        
        // Find the closest parent with id that matches the given regex
        for (var i = 0; i < ancestors.length; i++) {
            var ancestor = ancestors[i];
            if (regex.test(ancestor.id)) {
                return ancestor;
            }
        }
        
        return null;
    },
    
    apply: function(anchor) {
        var trackingId = "";
            
        if (this.options.hrefRegexes.length == 0) {
            var pageId, regionId, articleId, hrefFileType, anchorTitle;

            // Page ID
            var metaTags = $$('meta[name=' + this.options.pageIdMetaTagName + ']');
            if (metaTags.length > 0) {
                var metaTag = metaTags[0];
                pageId = metaTag.readAttribute('content');
            }

            // Region ID
            var closestRegion = this.findClosestBySelector(anchor, this.options.regions);
            if (closestRegion != null) regionId = closestRegion.readAttribute('id');

            // Article ID
            var closestArticle = this.findClosestByRegex(anchor, new RegExp(this.options.articleIdRegex));
            if (closestArticle != null) articleId = closestArticle.readAttribute('id');

            // Href File Type
            TrackMe.PageViewTypes.each(function(pageViewType) {
                var regex = new RegExp(pageViewType.regex);
                if (regex.test(anchor.readAttribute('href'))) {
                    hrefFileType = pageViewType.name;
                }
            });

            // Anchor title
            var title = anchor.readAttribute('title');
            if (title !== null) {
                anchorTitle = this.encodeURL(anchor.readAttribute('title'));   
            }

            // Final tracking ID
            [ pageId, regionId, articleId, hrefFileType, anchorTitle ].each(function(d) {
                if (d != null && d != "") {
                    trackingId += "/" + d;
                }
            });   
        } else {
            // Last resort - Use regex to track external href links
            this.options.hrefRegexes.each(function(regex) {
                var regex = new RegExp(regex);
                var href = anchor.readAttribute('href');
                
                if (!regex.test(href)) {
                    trackingId = this.encodeURL(title || anchor.innerHTML.unescapeHTML());
                    if (trackingId == "") { trackingId = href || ""; }
                }
            }.bind(this));
        }
        
        // Call the callback function
        if (trackingId != "") {
            anchor.observe('click', function(event) {
                this.options.anchorClicked.call(anchor, trackingId, event);
            }.bind(this));
        }
    }
});

TrackMe.PageViewTypes = [
    { name: "video",    regex: "^.+\.((flv)|(moo?v)|(mpe?g))$" },
    { name: "document", regex: "^.+\.((pdf)|(doc)|(txt)|(rtf))$" },
    { name: "image",    regex: "^.+\.((png)|(jpe?g)|(gif)|(bmp)|(tiff?))$" }
];