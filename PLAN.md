बताओ, the plan is to make a roadmap website. जहाँ पे मुझको एक ऐसी website चाहिए जिसमें front end है, back end है, database है, और front end के लिए हम लोग Next.js use कर रहे हैं। Back end के लिए भी Next.js use हो सकता है। Database local पे अगर मैं चला रहा हूँ, तो SQLite use करूँगा, but वहीं पे अगर मैं इसको productionize करना चाहता हूँ, तो Turso use करने वाला हूँ। मेरा जो deployment होगा, वो होगा Vercel पे। मेरी जो CI/CD pipelines रहेंगी, वो GitHub Actions के through रहेंगी। ये initial plan है। चलो, इसको initial plan के heading पे लिख दो। 

The tech stack list would be:
- Frontend: Next.js
- SQLite
- Vercel deployment
- Sub-agents for linting and test cases
These sub-agents will be built with Claude. That's the plan. That's it.

This project will be done in two phases:
1. Deployment using GitHub Actions to Vercel via my GitHub repository. यहाँ पे मेरा जो भी application होगा, वो पूरा का पूरा Claude पे develop होगा, so मुझको एक Claude का proper prompt चाहिए होगा, proper skills चाहिए होंगी और sub-agents चाहिए होंगे।
2. इसी project के Docker containers बनेंगे, और उसको Terraform के through AWS पे एक EC2 instance बना के Docker compose के through मैं deploy करने वाला हूँ।
This is my phase two.