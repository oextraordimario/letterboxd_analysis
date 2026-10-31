"""Roda o pipeline completo: python -m pipeline [--refresh]"""

import sys

from pipeline import build_analytics, scrape_list, scrape_members, scrape_people

for step in (scrape_list, scrape_members, scrape_people):
    step.main()
sys.argv = sys.argv[:1]
build_analytics.build()
