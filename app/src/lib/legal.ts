// Legal constants shared by the signup age gate and the copyright page.

// Singapore's PDPC treats under-13s as unable to consent on their own.
export const MINIMUM_AGE = 13;

// Designated copyright (DMCA) agent. Fill these in once the agent is
// registered with the US Copyright Office (copyright.gov/dmca-directory);
// /copyright shows whichever of these are set.
export const COPYRIGHT_AGENT: {
  name: string | null;
  email: string | null;
  postalAddress: string | null;
  phone: string | null;
} = {
  name: null,
  email: null,
  postalAddress: null,
  phone: null,
};
