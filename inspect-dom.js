#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function inspectDOM() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
        
        // Get all button elements
        const buttons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.map(btn => ({
                id: btn.id,
                className: btn.className,
                textContent: btn.textContent?.trim(),
                onclick: btn.onclick ? btn.onclick.toString() : null
            }));
        });
        
        console.log('=== BUTTONS FOUND ===');
        buttons.forEach(btn => {
            console.log(`ID: ${btn.id}`);
            console.log(`Class: ${btn.className}`);
            console.log(`Text: ${btn.textContent}`);
            console.log(`OnClick: ${btn.onclick}`);
            console.log('---');
        });
        
        // Get navigation structure
        const navElements = await page.evaluate(() => {
            const navs = Array.from(document.querySelectorAll('nav, .nav, [class*="nav"], [class*="tab"]'));
            return navs.map(nav => ({
                tagName: nav.tagName,
                id: nav.id,
                className: nav.className,
                textContent: nav.textContent?.trim().substring(0, 100),
                children: Array.from(nav.children).map(child => ({
                    tagName: child.tagName,
                    id: child.id,
                    className: child.className,
                    textContent: child.textContent?.trim()
                }))
            }));
        });
        
        console.log('\n=== NAVIGATION ELEMENTS ===');
        navElements.forEach(nav => {
            console.log(`Tag: ${nav.tagName}, ID: ${nav.id}, Class: ${nav.className}`);
            nav.children.forEach(child => {
                console.log(`  Child - Tag: ${child.tagName}, ID: ${child.id}, Class: ${child.className}, Text: ${child.textContent}`);
            });
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

inspectDOM();