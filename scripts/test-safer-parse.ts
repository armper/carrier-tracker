import fs from 'fs'
import path from 'path'
import { SAFERScraper } from '../src/lib/safer-scraper'

// Change this to the file you want to test
const htmlFile = path.join(__dirname, '../safer-4018551.html')
const dotNumber = '4018551'

async function main() {
  const html = fs.readFileSync(htmlFile, 'utf8')
  const scraper = new SAFERScraper()
  // @ts-expect-error: Access private method for testing
  const parsed = scraper.parseCarrierHTML(html, dotNumber)
  console.log('Parsed carrier data:', parsed)
}

main().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
}) 