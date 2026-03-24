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
        },{id: "nav-github",
          title: "GitHub",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "post-google-gemini-updates-flash-1-5-gemma-2-and-project-astra",
        
          title: 'Google Gemini updates: Flash 1.5, Gemma 2 and Project Astra <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        
        description: "We’re sharing updates across our Gemini family of models and a glimpse of Project Astra, our vision for the future of AI assistants.",
        section: "Posts",
        handler: () => {
          
            window.open("https://blog.google/technology/ai/google-gemini-update-flash-ai-assistant-io-2024/", "_blank");
          
        },
      },{id: "post-displaying-external-posts-on-your-al-folio-blog",
        
          title: 'Displaying External Posts on Your al-folio Blog <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.open("https://medium.com/@al-folio/displaying-external-posts-on-your-al-folio-blog-b60a1d241a0a?source=rss-17feae71c3c4------2", "_blank");
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-i-started-my-ph-d-in-bioinformatics-at-callahan-lab-at-north-carolina-state-university",
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
          section: "News",},{id: "projects-project-1",
          title: 'project 1',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-project-2",
          title: 'project 2',
          description: "a project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-project-3-with-very-long-name",
          title: 'project 3 with very long name',
          description: "a project that redirects to another website",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "projects-project-4",
          title: 'project 4',
          description: "another without an image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project/";
            },},{id: "projects-project-5",
          title: 'project 5',
          description: "a project with a background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project/";
            },},{id: "projects-project-6",
          title: 'project 6',
          description: "a project with no image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_project/";
            },},{id: "projects-project-7",
          title: 'project 7',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/7_project/";
            },},{id: "projects-project-8",
          title: 'project 8',
          description: "an other project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/8_project/";
            },},{id: "projects-project-9",
          title: 'project 9',
          description: "another project with an image 🎉",
          section: "Projects",handler: () => {
              window.location.href = "/projects/9_project/";
            },},{id: "teachings-data-science-fundamentals",
          title: 'Data Science Fundamentals',
          description: "This course covers the foundational aspects of data science, including data collection, cleaning, analysis, and visualization. Students will learn practical skills for working with real-world datasets.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/data-science-fundamentals/";
            },},{id: "teachings-introduction-to-machine-learning",
          title: 'Introduction to Machine Learning',
          description: "This course provides an introduction to machine learning concepts, algorithms, and applications. Students will learn about supervised and unsupervised learning, model evaluation, and practical implementations.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/introduction-to-machine-learning/";
            },},{
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
