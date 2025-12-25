import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export const dynamic = 'force-dynamic'; // Prevent caching of the token route

/**
 * Robust token endpoint for local development.
 * Uses 'gcloud auth application-default login' credentials.
 */
export async function GET() {
  try {
    console.log('🔄 Attempting to generate ADC Token...');
    
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    
      console.error('❌ No token returned from Google Auth');
      return NextResponse.json({ error: 'No token returned' }, { status: 500 });
    }

    console.log('✅ ADC Token generated successfully:', accessTokenResponse.token.substring(0, 10) + '...');
    
    return NextResponse.json({ 
      token: accessTokenResponse.token 
    });
  } catch (error: any) {
    console.error('❌ Token generation failed:', error.message);
    // If we get here, the ADC file is likely missing or invalid
    return NextResponse.json(
      { 
        error: error.message,
        hint: 'Try running: gcloud auth application-default login'
      }, 
      { status: 500 }
    );
  }
}
