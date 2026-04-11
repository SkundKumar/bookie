import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images:{remotePatterns:[
    {protocol:'https',
      hostname:'j81aqrlt69p9tsmc.public.blob.vercel-storage.com',
    },
    {protocol:'https',
      hostname:'bookie-storage-bhondu.s3.us-east-1.amazonaws.com',
    }
  ]}
};

export default nextConfig;
