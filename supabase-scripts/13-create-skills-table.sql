-- Skills lookup table for typeahead / autocomplete
create table if not exists public.skills (
    id bigint generated always as identity primary key,
    name text not null unique,
    usage_count integer default 1,
    created_at timestamptz default now()
);

-- Case-insensitive unique index for deduplication
create unique index if not exists skills_name_lower_idx on public.skills (lower(name));

-- Index for fast prefix search (works without pg_trgm extension)
create index if not exists skills_name_prefix_idx on public.skills (lower(name) text_pattern_ops);

-- Optional: if you have pg_trgm enabled, uncomment for fuzzy search:
-- create index if not exists skills_name_trgm_idx on public.skills using gin (name gin_trgm_ops);

-- RLS: anyone can read skills, only authenticated users can insert
alter table public.skills enable row level security;

create policy "Anyone can read skills"
    on public.skills for select
    using (true);

create policy "Authenticated users can insert skills"
    on public.skills for insert
    to authenticated
    with check (true);

-- Seed skills across web3, software engineering, design, data, devops, business, and more
insert into public.skills (name) values
    -- Web3 / Blockchain
    ('Solidity'),
    ('Smart Contracts'),
    ('DeFi'),
    ('Ethereum'),
    ('Web3'),
    ('NFTs'),
    ('Tokenomics'),
    ('Move'),
    ('Solana'),
    ('Polygon'),
    ('Zero Knowledge Proofs'),
    ('Layer 2'),
    ('DAOs'),
    ('IPFS'),
    ('Hardhat'),
    ('Foundry'),
    ('ERC-20'),
    ('ERC-721'),
    ('Chainlink'),
    ('Uniswap'),
    ('Cosmos'),
    ('Polkadot'),
    ('Avalanche'),
    ('Starknet'),
    ('Cairo'),
    ('Vyper'),
    ('MEV'),
    ('DePIN'),
    -- Languages
    ('JavaScript'),
    ('TypeScript'),
    ('Python'),
    ('Rust'),
    ('Go'),
    ('Java'),
    ('C++'),
    ('C#'),
    ('Ruby'),
    ('PHP'),
    ('Swift'),
    ('Kotlin'),
    ('Scala'),
    ('Elixir'),
    ('Haskell'),
    ('Lua'),
    ('R'),
    ('Dart'),
    ('Zig'),
    -- Frontend
    ('React'),
    ('Next.js'),
    ('Vue.js'),
    ('Angular'),
    ('Svelte'),
    ('HTML'),
    ('CSS'),
    ('Tailwind CSS'),
    ('SASS'),
    ('Redux'),
    ('Zustand'),
    ('Framer Motion'),
    ('Three.js'),
    ('WebGL'),
    ('Responsive Design'),
    ('Accessibility'),
    -- Backend
    ('Node.js'),
    ('Express'),
    ('Django'),
    ('Flask'),
    ('FastAPI'),
    ('Spring Boot'),
    ('Ruby on Rails'),
    ('Laravel'),
    ('NestJS'),
    ('GraphQL'),
    ('REST APIs'),
    ('gRPC'),
    ('WebSockets'),
    ('Microservices'),
    -- Databases
    ('PostgreSQL'),
    ('MySQL'),
    ('MongoDB'),
    ('Redis'),
    ('Elasticsearch'),
    ('DynamoDB'),
    ('Supabase'),
    ('Firebase'),
    ('Prisma'),
    ('SQLite'),
    ('Cassandra'),
    ('Neo4j'),
    -- DevOps / Cloud
    ('AWS'),
    ('Google Cloud'),
    ('Azure'),
    ('Docker'),
    ('Kubernetes'),
    ('Terraform'),
    ('CI/CD'),
    ('GitHub Actions'),
    ('Jenkins'),
    ('Linux'),
    ('Nginx'),
    ('Vercel'),
    ('Cloudflare'),
    ('Serverless'),
    -- Data / AI / ML
    ('Machine Learning'),
    ('Deep Learning'),
    ('Natural Language Processing'),
    ('Computer Vision'),
    ('PyTorch'),
    ('TensorFlow'),
    ('LLMs'),
    ('Prompt Engineering'),
    ('Data Science'),
    ('Data Engineering'),
    ('Pandas'),
    ('Apache Spark'),
    ('ETL'),
    ('Data Visualization'),
    ('RAG'),
    -- Mobile
    ('React Native'),
    ('Flutter'),
    ('iOS Development'),
    ('Android Development'),
    ('SwiftUI'),
    ('Jetpack Compose'),
    -- Security
    ('Security Auditing'),
    ('Penetration Testing'),
    ('Cryptography'),
    ('OAuth'),
    ('OWASP'),
    ('SOC 2'),
    -- Design / Product
    ('UI Design'),
    ('UX Design'),
    ('Figma'),
    ('Design Systems'),
    ('Prototyping'),
    ('User Research'),
    ('Wireframing'),
    -- Business / Strategy
    ('Product Management'),
    ('Technical Writing'),
    ('Project Management'),
    ('Agile'),
    ('Scrum'),
    ('Growth Marketing'),
    ('SEO'),
    ('Analytics'),
    ('Fundraising'),
    ('Go-to-Market Strategy'),
    -- Testing
    ('Unit Testing'),
    ('Integration Testing'),
    ('E2E Testing'),
    ('Jest'),
    ('Cypress'),
    ('Playwright'),
    ('Test-Driven Development'),
    -- Other
    ('System Design'),
    ('API Design'),
    ('Open Source'),
    ('Technical Leadership'),
    ('Mentoring'),
    ('Code Review'),
    ('Performance Optimization'),
    ('Game Development'),
    ('Unity'),
    ('Unreal Engine'),
    ('AR/VR'),
    ('IoT'),
    ('Embedded Systems'),
    ('Robotics')
on conflict (lower(name)) do nothing;
