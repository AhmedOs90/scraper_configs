async function handleLinkPagination({ page, log, config, crawler,entryUrlSet }) {
  log.info('Handling pagination for link-based collection page...');

  const nextPageLink = await page.$(config.pagination.selector);

  if (nextPageLink) {
    const nextPageUrl = await nextPageLink.evaluate(el => el.href);
    if (nextPageUrl) {
      log.info(`Next page URL found: ${nextPageUrl}`);
            

      entryUrlSet?.add(nextPageUrl);


      await crawler.addRequests([nextPageUrl]);
    }
  } else {
    log.info('No next page link found. Pagination complete.');
  }
}

export default handleLinkPagination;

