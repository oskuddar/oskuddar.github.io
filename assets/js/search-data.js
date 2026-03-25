// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-roles",
          title: "roles",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/roles/";
          },
        },{id: "nav-github",
          title: "GitHub",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "nav-writing",
          title: "writing",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/_pages/cv/";
          },
        },{id: "post-the-start-of-becoming-a-better-scientific-writer",
        
          title: "The Start of Becoming a Better Scientific Writer",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/thestart/";
          
        },
      },{id: "news-i-started-my-ph-d-in-bioinformatics-at-callahan-lab-at-north-carolina-state-university",
          title: 'I started my Ph.D. in Bioinformatics at Callahan Lab at North Carolina State...',
          description: "",
          section: "News",},{id: "news-i-presented-my-poster-titled-trnl-database-generation-and-curation-at-the-genomic-sciences-graduate-student-association-ncsu",
          title: 'I presented my poster titled “trnL Database Generation and Curation” at the Genomic...',
          description: "",
          section: "News",},{id: "news-congratulations-to-the-team-on-our-paper-published-in-cell-host-amp-amp-microbe",
          title: 'Congratulations to the team on our paper published in Cell Host &amp;amp;amp; Microbe....',
          description: "",
          section: "News",},{id: "news-i-won-the-symposium-presentation-award-for-a-15-minute-talk-titled-validating-dna-metabarcoding-for-characterization-of-pollen-from-surface-soils-at-the-genomic-sciences-symposium-ncsu",
          title: 'I won the Symposium Presentation Award for a 15-minute talk titled “Validating DNA...',
          description: "",
          section: "News",},{id: "news-i-attended-the-microbiome-data-congress-in-boston-usa",
          title: 'I attended the Microbiome Data Congress in Boston, USA.',
          description: "",
          section: "News",},{id: "news-i-attended-the-triangle-universities-startup-bootcamp-in-durham-usa-supported-by-the-ncsu-innovation-and-entrepreneurship",
          title: 'I attended the Triangle Universities Startup Bootcamp in Durham, USA (supported by the...',
          description: "",
          section: "News",},{id: "news-i-attended-the-american-society-for-microbiology-asm-microbe-2024-conference-in-atlanta-usa",
          title: 'I attended the American Society for Microbiology (ASM) Microbe 2024 conference in Atlanta,...',
          description: "",
          section: "News",},{id: "news-i-attended-the-international-society-for-computational-biology-ismb-conference-in-montreal-ca",
          title: 'I attended the International Society for Computational Biology (ISMB) conference in Montreal, CA....',
          description: "",
          section: "News",},{id: "news-i-attended-the-cfci-premier-accelerator-as-part-of-an-entrepreneurship-project-on-the-microbiome-in-durham-usa",
          title: 'I attended the CFCI-PreMiEr Accelerator as part of an entrepreneurship project on the...',
          description: "",
          section: "News",},{id: "news-i-presented-a-15-min-talk-titled-from-measured-bias-to-differential-abundance-analysis-at-the-genomic-sciences-graduate-student-association-ncsu",
          title: 'I presented a 15 min talk titled “From Measured Bias to Differential Abundance...',
          description: "",
          section: "News",},{id: "news-we-published-a-methods-paper-in-acta-palaeobotanica",
          title: 'We published a methods paper in Acta Palaeobotanica.',
          description: "",
          section: "News",},{id: "news-i-presented-a-20-min-talk-titled-from-measured-bias-to-differential-abundance-analysis-at-the-first-friday-microbiome-seminar-unc-chapel-hill-usa",
          title: 'I presented a 20 min talk titled “From Measured Bias to Differential Abundance...',
          description: "",
          section: "News",},{id: "news-congratulations-to-the-team-on-our-paper-published-in-journal-of-clinical-investigation",
          title: 'Congratulations to the team on our paper published in Journal of Clinical Investigation....',
          description: "",
          section: "News",},{id: "news-i-successfully-defended-my-dissertation-titled-evaluation-of-dna-metabarcoding-for-characterization-of-pollen-in-surface-soil-samples-with-potential-forensic-applications",
          title: 'I successfully defended my dissertation titled “Evaluation of DNA metabarcoding for characterization of...',
          description: "",
          section: "News",},{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/ozgekuddar", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=1-wpavIAAAAJ", "_blank");
        },
      },{
        id: 'social-custom_social',
        title: 'Custom_social',
        section: 'Socials',
        handler: () => {
          window.open("https://soundcloud.com/versatilefractalism", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
