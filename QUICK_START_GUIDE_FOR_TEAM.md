# ⚡ Quick Start Guide for DocumentiUlia Team

**For:** Launch Team Members
**Updated:** 2025-01-19
**Purpose:** Fast reference for common tasks during beta launch

---

## 🎯 Your Role at a Glance

### If you're the **Technical Lead:**
- Monitor server health
- Fix bugs ASAP (priority: critical < 4h, major < 24h)
- Review beta user feedback for technical issues
- Deploy hotfixes when needed

### If you're in **Customer Success:**
- Review beta applications
- Accept/reject within 2 hours
- Onboard accepted users (welcome call + training)
- Gather feedback weekly

### If you're in **Marketing:**
- Post social media content daily
- Respond to comments/messages within 1 hour
- Monitor analytics (traffic, conversions)
- Adjust messaging based on performance

### If you're in **Support:**
- Answer support emails within 2 hours
- Maintain FAQ based on common questions
- Escalate technical issues to dev team
- Track user pain points

---

## 📂 Essential Files & Locations

### Documentation You Need to Know

| Document | Location | When to Use |
|----------|----------|-------------|
| **Pre-Launch Checklist** | `/PRE_LAUNCH_CHECKLIST.md` | Before launch day |
| **Launch Readiness Report** | `/FINAL_LAUNCH_READINESS_REPORT.md` | Understanding overall status |
| **Social Media Calendar** | `/SOCIAL_MEDIA_LAUNCH_PACKAGE.md` | Daily content posting |
| **WooCommerce Guide** | `/integrations/woocommerce/README.md` | Helping users with integration |
| **Project Index** | `/COMPLETE_PROJECT_INDEX.md` | Finding anything in the project |

### Key URLs

| Purpose | URL |
|---------|-----|
| **Production Site** | https://documentiulia.ro |
| **Beta Application** | https://documentiulia.ro/beta-application.html |
| **Retail Landing** | https://documentiulia.ro/retail.html |
| **Login** | https://documentiulia.ro/login |
| **Admin Panel** | https://documentiulia.ro/admin |

### Server Access

```bash
# SSH into server
ssh root@95.216.112.59

# Key directories
cd /var/www/documentiulia.ro        # Application root
cd /var/log/nginx                   # Web server logs
cd /var/log/postgresql              # Database logs
```

---

## 🚀 Common Tasks - Step by Step

### Task 1: Accept a Beta Application

1. **Check new applications:**
   ```sql
   psql -U accountech_app -d accountech_production
   SELECT * FROM beta_applications WHERE status = 'pending' ORDER BY created_at DESC;
   ```

2. **Review application details:**
   - Score ≥60: Auto-accept
   - Score 40-59: Manual review
   - Score <40: Waitlist

3. **Accept user:**
   ```sql
   UPDATE beta_applications
   SET status = 'accepted'
   WHERE email = 'applicant@example.com';
   ```

4. **Send acceptance email manually or via EmailService**

5. **Create user account:**
   - Go to admin panel
   - Create new company + user
   - Send credentials to user

### Task 2: Post Social Media Content

1. **Get today's content:**
   - Open `SOCIAL_MEDIA_LAUNCH_PACKAGE.md`
   - Find today's date in calendar
   - Copy the post text

2. **Create visual (if needed):**
   - Open Canva
   - Use DocumentiUlia template
   - Export as PNG (1200x1200 for Instagram, 1200x630 for Facebook)

3. **Post on platforms:**
   - **Facebook:** Business Suite → Create Post
   - **LinkedIn:** Company Page → Start a post
   - **Instagram:** Mobile app or Creator Studio

4. **Engage:**
   - Set reminder to check in 1 hour
   - Respond to ALL comments within 2 hours

### Task 3: Handle Support Request

1. **Check support inbox:**
   - Email: support@documentiulia.ro
   - Or use support ticket system if configured

2. **Categorize request:**
   - **Technical issue:** Forward to tech team
   - **How-to question:** Check FAQ, respond with guide
   - **Feature request:** Log in product backlog
   - **Bug report:** Create ticket, assign to dev

3. **Respond within 2 hours:**
   ```
   Subject: Re: [Original Subject]

   Bună [Name],

   Mulțumim pentru mesaj! [Answer their question]

   [Provide solution/next steps]

   Dacă mai ai întrebări, nu ezita să ne contactezi!

   Cu respect,
   [Your Name]
   Echipa DocumentiUlia
   ```

4. **Follow up:**
   - If issue not resolved in 24h, send update
   - Mark as resolved when confirmed by user

### Task 4: Monitor Server Health

1. **Quick health check:**
   ```bash
   # SSH into server
   ssh root@95.216.112.59

   # Check services
   systemctl status nginx php8.2-fpm postgresql

   # Check server load
   uptime
   htop  # Press q to quit

   # Check disk space
   df -h

   # Check recent errors
   tail -f /var/log/nginx/error.log
   ```

2. **If something is down:**
   ```bash
   # Restart the service
   sudo systemctl restart nginx
   # or
   sudo systemctl restart php8.2-fpm
   # or
   sudo systemctl restart postgresql
   ```

3. **Check application logs:**
   ```bash
   tail -f /var/www/documentiulia.ro/logs/error.log
   ```

### Task 5: Deploy a Hotfix

1. **Make code changes locally**

2. **Test locally**

3. **Deploy to production:**
   ```bash
   # SSH into server
   ssh root@95.216.112.59

   # Navigate to app directory
   cd /var/www/documentiulia.ro

   # Pull latest changes
   git pull origin main

   # If composer dependencies changed
   composer install --no-dev

   # If frontend changed
   npm run build

   # Reload PHP-FPM
   sudo systemctl reload php8.2-fpm

   # Reload Nginx
   sudo systemctl reload nginx
   ```

4. **Test production site immediately**

5. **Monitor for errors (next 30 min)**

### Task 6: Generate Weekly Report

1. **Collect metrics:**
   - GA4: Visitors, conversions, top pages
   - Database: New users, beta applications
   - Social media: Reach, engagement
   - Support: Tickets, resolution time

2. **Use this template:**
   ```
   DOCUMENTIULIA - WEEKLY REPORT
   Week of: [Date Range]

   📊 METRICS:
   - Website Visitors: XXX (+/-X%)
   - Beta Applications: XX
   - Beta Acceptances: XX
   - Active Users: XX
   - MRR: €XXX

   📱 SOCIAL MEDIA:
   - Total Reach: XXX
   - Engagement Rate: X.X%
   - New Followers: XX

   🎯 TOP WINS:
   - [Achievement 1]
   - [Achievement 2]

   ⚠️ CHALLENGES:
   - [Challenge 1]
   - [Challenge 2]

   📋 NEXT WEEK FOCUS:
   - [Priority 1]
   - [Priority 2]
   ```

---

## 🆘 Emergency Procedures

### 🔥 CRITICAL: Website is Down

**DO THIS IMMEDIATELY:**

1. **Check services:**
   ```bash
   ssh root@95.216.112.59
   systemctl status nginx php8.2-fpm postgresql
   ```

2. **Restart if needed:**
   ```bash
   sudo systemctl restart nginx
   sudo systemctl restart php8.2-fpm
   ```

3. **Check logs:**
   ```bash
   tail -n 100 /var/log/nginx/error.log
   ```

4. **Communicate:**
   - Post on social media: "We're experiencing technical difficulties. Working on a fix. ETA: 30 min."
   - Send email to active users if down >1 hour

5. **Alert team:**
   - Message in team chat
   - Call technical lead if not responding

### 🔴 HIGH PRIORITY: Database Issues

1. **Check PostgreSQL:**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl restart postgresql
   ```

2. **Check connections:**
   ```bash
   psql -U accountech_app -d accountech_production -c "SELECT count(*) FROM users;"
   ```

3. **If data corruption suspected:**
   - **STOP**: Don't restart database
   - Call DBA immediately
   - Consider restoring from backup

### 🟡 MEDIUM: High Error Rate

1. **Check error logs:**
   ```bash
   tail -f /var/www/documentiulia.ro/logs/error.log
   ```

2. **Identify pattern:**
   - Same error repeated? (Code bug)
   - Different users? (Server issue)
   - One user? (User error)

3. **Quick fix if possible:**
   - Deploy hotfix
   - Or add workaround to FAQ

4. **Log issue for later:**
   - Create GitHub issue
   - Add to sprint backlog

---

## 📞 Who to Contact

### For Technical Issues
**Server/Infrastructure:** [Tech Lead Name] - [Phone]
**Application Bugs:** [Developer Name] - [Phone]
**Database Problems:** [DBA Name] - [Phone]

### For Business Issues
**Product Questions:** [Product Owner] - [Phone]
**Customer Issues:** [CS Lead] - [Phone]
**Marketing Questions:** [Marketing Lead] - [Phone]

### External Vendors
**Hosting (Hetzner):** support ticket at https://console.hetzner.cloud
**Email (SendGrid):** https://support.sendgrid.com
**Domain Registrar:** [Company name] - [Support contact]

---

## 💬 Communication Guidelines

### Response Time Commitments

| Channel | Target Response Time | Max Response Time |
|---------|---------------------|-------------------|
| **Support Email** | 2 hours | 4 hours |
| **Social Media Comment** | 1 hour | 2 hours |
| **Social Media DM** | 30 minutes | 1 hour |
| **Beta Applicant** | 2 hours | 4 hours |
| **Technical Issue** | Immediate | 15 minutes |

### Tone of Voice

**DO:**
- Be friendly and approachable
- Use simple language (avoid jargon)
- Be honest about issues
- Show empathy
- Use user's name

**DON'T:**
- Be defensive
- Make excuses
- Overpromise features
- Use technical jargon
- Copy-paste generic responses

### Standard Greetings

**Email:**
```
Bună [Name],

Mulțumim că ne-ai contactat!
[Answer]

Cu respect,
[Your Name]
Echipa DocumentiUlia
```

**Social Media:**
```
Salut [Name]! 👋
[Answer]
Dacă mai ai întrebări, scrie-ne! 😊
```

---

## 📊 Daily Routine

### Morning (9:00 AM)

- [ ] Check overnight metrics (GA4, social media)
- [ ] Review beta applications (accept/reject)
- [ ] Check support inbox
- [ ] Check server health
- [ ] Team standup (15 min)

### Midday (12:00 PM)

- [ ] Post scheduled social content
- [ ] Respond to morning comments/messages
- [ ] Review beta user activity
- [ ] Check for any technical issues

### Afternoon (3:00 PM)

- [ ] Check metrics again
- [ ] Respond to support tickets
- [ ] Engage on social media
- [ ] Plan tomorrow's content

### Evening (6:00 PM)

- [ ] End of day metrics review
- [ ] Respond to any pending items
- [ ] Log issues for tomorrow
- [ ] Send daily summary to team (if required)

---

## 📈 Key Metrics to Track

### Daily Metrics

**Acquisition:**
- Website visitors (GA4)
- Beta applications submitted
- Traffic sources (organic, social, direct)

**Activation:**
- Beta acceptances sent
- User accounts created
- Onboarding completed

**Engagement:**
- Active users today
- Features used
- Time spent in app

**Retention:**
- Users who returned
- Churn (users who didn't return)

**Social Media:**
- Post reach
- Engagement rate (likes + comments + shares / reach)
- New followers

### Weekly Metrics

- Total users (cumulative)
- Active users (weekly active)
- Beta completion rate
- Social media growth
- Support ticket volume
- Average response time

### How to Access Metrics

**Google Analytics 4:**
1. Go to https://analytics.google.com
2. Select "DocumentiUlia" property
3. Reports → Realtime (for live data)
4. Reports → Acquisition → Traffic acquisition (for sources)

**Database Queries:**
```sql
-- Daily signups
SELECT COUNT(*) FROM users
WHERE created_at::date = CURRENT_DATE;

-- Beta applications today
SELECT COUNT(*) FROM beta_applications
WHERE created_at::date = CURRENT_DATE;

-- Active users (logged in last 7 days)
SELECT COUNT(DISTINCT user_id) FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 🎓 Learning Resources

### Product Knowledge
- **Full Documentation:** `/COMPLETE_PROJECT_INDEX.md`
- **User Guides:** `/docs/` folder
- **API Documentation:** In code comments

### Tools Training
- **GA4 Tutorial:** https://analytics.google.com/analytics/academy
- **Social Media Best Practices:** https://www.facebook.com/business/learn
- **Customer Support:** https://www.zendesk.com/blog/

### Romanian Business Context
- **ANAF (Tax Authority):** https://www.anaf.ro
- **SME Statistics:** https://ec.europa.eu/eurostat

---

## ✅ Quick Wins Checklist

### Your First Day

- [ ] Read this guide completely
- [ ] Access all essential tools (GA4, social media, email)
- [ ] Test login to production site
- [ ] Review current beta applications
- [ ] Introduce yourself on social media
- [ ] Shadow someone on the team

### Your First Week

- [ ] Handle 10+ support requests
- [ ] Accept 2+ beta applicants
- [ ] Post 5+ social media updates
- [ ] Complete 1+ user onboarding call
- [ ] Identify 3+ product improvements

### Your First Month

- [ ] Become product expert (can demo all features)
- [ ] Build relationship with beta users
- [ ] Contribute to product roadmap
- [ ] Train new team member
- [ ] Suggest process improvements

---

## 🎉 Celebrate Wins!

### Small Wins (Celebrate Immediately)
- First beta application ✅
- First user creates invoice ✅
- First positive testimonial ✅
- First social post gets 100+ likes ✅

### Medium Wins (Team Celebration)
- 10 beta users activated 🎊
- 100 social media followers 🎊
- First paying customer 🎊
- Zero critical bugs for 1 week 🎊

### Big Wins (Team Party!)
- 100 total users 🎉
- €1,000 MRR 🎉
- Featured in press 🎉
- Product Hunt launch 🎉

**Remember:** Every user is a real person trusting us with their business. Treat them like gold! ⭐

---

## 📖 Glossary

**ARPU:** Average Revenue Per User
**ARR:** Annual Recurring Revenue
**MRR:** Monthly Recurring Revenue
**WAU:** Weekly Active Users
**MAU:** Monthly Active Users
**CAC:** Customer Acquisition Cost
**LTV:** Lifetime Value
**Churn:** Users who stop using the product
**NPS:** Net Promoter Score
**GA4:** Google Analytics 4
**CTA:** Call to Action
**CRM:** Customer Relationship Management

---

**Good luck on launch day! You've got this!** 🚀

**Questions?** Ask in team chat or email [team-lead@documentiulia.ro]

---

**© 2025 DocumentiUlia - Quick Start Guide for Team**
**Version:** 1.0
