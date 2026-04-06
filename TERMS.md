# Terms of Service

**Last Updated**: April 6, 2026

Welcome to Dayframe. By using the Dayframe application ("Service", "App", or "Software"), you agree to be bound by the following terms and conditions.

## 1. Description of Service
Dayframe is a full-stack, self-hosted journaling and productivity application provided as an open-source or source-available software package. The Service includes a web application backend built with Next.js and a desktop client packaged via Tauri. 

## 2. Local-First and Self-Hosting
By design, Dayframe is intended to be run locally or self-hosted by the user. 
- **Data Ownership**: All data, including journal entries, images, and user accounts, is stored in your designated MongoDB database. We do not have access to your data, nor do we collect telemetry or personal information from your self-hosted instance.
- **Responsibility**: You are solely responsible for securing your database, maintaining your server daemon, configuring rate limiting (via Redis), and securing your environment variables (including Auth secrets).

## 3. License and Acceptable Use
You are granted a limited, non-exclusive, non-transferable license to use the Software for personal or internal business purposes, subject to the codebase's associated license. 
You agree NOT to:
- Use the Software for any illegal or unauthorized purpose.
- Attempt to exploit or bypass the security mechanisms of the Software.
- Resell or redistribute the Software without explicit authorization.

## 4. Third-Party Services
Dayframe integrates with third-party services (e.g., Google OAuth, Resend for emails). Your use of these services is subject to their respective Terms of Service and Privacy Policies. You are responsible for managing your API keys and quotas for these third-party providers.

## 5. Disclaimer of Warranties
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 6. Modifications to Terms
We reserve the right to modify these terms at any time. Significant changes will be communicated via the project's repository. Continued use of the Software after changes constitutes acceptance of the new terms.

## 7. Contact
For any questions regarding these terms, please open an issue on the official project repository.
