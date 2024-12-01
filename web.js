const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

router.get('/', async (req, res) => {
    const url = req.query.url || 'https://subamskinclinic.com/about-subam-skin-clinic/';  // Default URL
    try {
        // Fetch the website's HTML
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        // Load HTML into Cheerio
        const $ = cheerio.load(data);

        // Fetch only the main body content (text within paragraphs, sections, divs, etc.)
        const bodyContent = [];
        
        // Select elements that likely contain main content like paragraphs, headings, and sections
        $('p, h1, h2, h3, h4, h5, h6, section, div').each((index, element) => {
            const contentText = $(element).text().trim();
            if (contentText) {
                bodyContent.push(contentText);  // Store the text content
            }
        });

        // Check if content is found
        if (bodyContent.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No content found on the page.',
            });
        }

        // Prepare the response with the body content
        const response = {
            success: true,
            bodyContent,  // Only includes the textual content
        };

        res.json(response);

    } catch (error) {
        console.error('Scraping Error:', error.message);

        // Provide specific error responses
        if (error.response) {
            // HTTP errors
            return res.status(error.response.status).json({
                success: false,
                error: `Failed to fetch URL: ${url}. HTTP Status: ${error.response.status}`,
            });
        } else if (error.request) {
            // No response
            return res.status(500).json({
                success: false,
                error: 'No response received. Check the URL or network connectivity.',
            });
        } else {
            // Other errors
            return res.status(500).json({
                success: false,
                error: `An unexpected error occurred: ${error.message}`,
            });
        }
    }
});

module.exports = router;
