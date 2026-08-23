import os

import certifi
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()  # must run before DATABASE_URL is read below, regardless of entry point

# TiDB Cloud (and most managed MySQL-compatible hosts) require TLS. Passing certifi's CA
# bundle explicitly avoids relying on the OS trust store, which macOS's python.org build
# does not wire up to the ssl module by default (SSLCertVerificationError otherwise).
_connect_args = {"ssl": {"ca": certifi.where()}}

# pool_pre_ping: without this, a connection MySQL/TiDB silently closed after its idle
# timeout comes back as "2006: MySQL server has gone away" on the *next* request that
# reuses it, not on connect — looks intermittent otherwise. pool_recycle proactively
# retires connections before they get that old.
engine = create_engine(
    os.environ["DATABASE_URL"],
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=_connect_args,
)
