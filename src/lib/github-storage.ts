// src/lib/github-storage.ts
// src/lib/github-storage.ts
const POSTS_PATH = 'data/posts.json';

export async function readPostsFromGitHub() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.warn('GitHub credentials not found, using local storage');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return []; // File doesn't exist yet
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const posts = JSON.parse(content);
    console.log('Successfully read posts from GitHub:', posts.length);
    return posts;
  } catch (error) {
    console.error('Error reading from GitHub:', error);
    return null;
  }
}

export async function writePostsToGitHub(posts: any[]) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.warn('GitHub credentials not found, skipping GitHub save');
    return false;
  }

  try {
    console.log('Starting GitHub sync for posts...');
    
    // Retry mechanism for SHA conflicts
    let retries = 3;
    while (retries > 0) {
      try {
        // Get current file SHA (required for updates)
        const currentFile = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        let sha = undefined;
        if (currentFile.ok) {
          const fileData = await currentFile.json();
          sha = fileData.sha;
          console.log('Got existing file SHA:', sha);
        } else {
          console.log('File does not exist, creating new file');
        }

        // Update or create file
        const content = Buffer.from(JSON.stringify(posts, null, 2)).toString('base64');
        
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Update posts data - ${new Date().toISOString()}`,
              content,
              sha,
            }),
          }
        );

        if (response.ok) {
          console.log('Successfully wrote to GitHub');
          return true;
        }
        
        if (response.status === 409) {
          console.log(`SHA conflict, retrying... (${retries} attempts left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          continue;
        }
        
        const errorText = await response.text();
        console.error('GitHub write failed:', response.status, errorText);
        return false;
        
      } catch (innerError) {
        console.error('Error in retry attempt:', innerError);
        retries--;
        if (retries === 0) throw innerError;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error writing to GitHub:', error);
    return false;
  }
}