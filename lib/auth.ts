import { FirebaseError } from "firebase/app";
import {
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { createUserProfile, getUserProfile } from "@/lib/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import {
  clearLocalAuthSession,
  createLocalAuthSession,
  createLocalUserProfile,
  getLocalAuthSession,
  loginLocalUser,
} from "@/lib/local-database";
import type {
  AuthActionResult,
  LoginFormValues,
  NGOProfile,
  DonorProfile,
  RegisterFormValues,
  UserProfileData,
  UserRole,
  UserProfile,
  VolunteerProfile,
} from "@/types";

export interface CurrentProfileSession {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserProfile["status"];
  verified: boolean;
  dashboardPath: string;
  profile: UserProfile | null;
  isLocalDemo: boolean;
}

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

function mapAuthError(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "The email address looks invalid. Please check it and try again.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email or password is incorrect.";
      case "auth/too-many-requests":
        return "Too many auth attempts were made. Please wait and try again.";
      case "auth/network-request-failed":
        return "Network error while talking to Firebase. Check your connection and try again.";
      default:
        return error.message || "A Firebase authentication error occurred.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown authentication error occurred.";
}

export function getDashboardPathForRole(role: UserRole) {
  switch (role) {
    case "ngo":
      return "/ngo/dashboard";
    case "volunteer":
      return "/volunteer/dashboard";
    case "donor":
      return "/donor";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export function getDefaultLoginValues(): LoginFormValues {
  return {
    email: "",
    password: "",
  };
}

function toProfileSession(
  profile: UserProfile,
  isLocalDemo: boolean,
): CurrentProfileSession {
  return {
    uid: profile.uid,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    verified: profile.verified,
    dashboardPath: getDashboardPathForRole(profile.role),
    profile,
    isLocalDemo,
  };
}

export async function loadCurrentProfileSession() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const profile = await getUserProfile(currentUser.uid);

  if (profile) {
    return toProfileSession(profile, !isFirebaseConfigured);
  }

  if (currentUser.email) {
    return {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
      email: currentUser.email,
      role: "donor" as const,
      status: "active" as const,
      verified: false,
      dashboardPath: "/donor",
      profile: null,
      isLocalDemo: !isFirebaseConfigured,
    };
  }

  return null;
}

export function subscribeToProfileSession(
  callback: (session: CurrentProfileSession | null) => void,
) {
  let cancelled = false;

  async function emitCurrentSession() {
    try {
      const session = await loadCurrentProfileSession();

      if (!cancelled) {
        callback(session);
      }
    } catch {
      if (!cancelled) {
        callback(null);
      }
    }
  }

  if (isFirebaseConfigured) {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), () => {
      void emitCurrentSession();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }

  if (typeof window === "undefined") {
    void emitCurrentSession();

    return () => {
      cancelled = true;
    };
  }

  const handleAuthUpdate = () => {
    void emitCurrentSession();
  };

  window.addEventListener("storage", handleAuthUpdate);
  window.addEventListener("rahatsetu-auth-updated", handleAuthUpdate);
  window.setTimeout(handleAuthUpdate, 0);

  return () => {
    cancelled = true;
    window.removeEventListener("storage", handleAuthUpdate);
    window.removeEventListener("rahatsetu-auth-updated", handleAuthUpdate);
  };
}

export function getDefaultRegisterValues(): RegisterFormValues {
  return {
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    role: "ngo",
    ngo: {
      ngoName: "",
      registrationNumber: "",
      focusAreas: "",
      verificationDocument: "",
    },
    volunteer: {
      skills: "",
      languages: "",
      availability: "available_now",
      assets: "",
      emergencyRadius: "",
    },
    donor: {
      helpTypes: [],
    },
  };
}

export function buildUserProfileData(values: RegisterFormValues): UserProfileData {
  const now = new Date().toISOString();
  const trimmedCity = values.city.trim();
  const baseLocation = {
    lat: 0,
    lng: 0,
    address: trimmedCity,
    city: trimmedCity,
  };

  const ngoProfile: NGOProfile | null =
    values.role === "ngo"
      ? {
          id: `ngo-${values.email.trim().toLowerCase()}`,
          organizationName: values.ngo.ngoName.trim(),
          registrationNumber: values.ngo.registrationNumber.trim(),
          focusAreas: values.ngo.focusAreas
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          contactName: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          verificationDocument: values.ngo.verificationDocument.trim(),
          location: baseLocation,
          createdAt: now,
          updatedAt: now,
          status: "pending",
          verified: false,
        }
      : null;

  const volunteerProfile: VolunteerProfile | null =
    values.role === "volunteer"
      ? {
          id: `volunteer-${values.email.trim().toLowerCase()}`,
          role: "volunteer",
          name: values.name.trim(),
          roleTitle: "Volunteer responder",
          email: values.email.trim(),
          phone: values.phone.trim(),
          city: trimmedCity,
          location: baseLocation,
          skills: values.volunteer.skills
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          assets: values.volunteer.assets
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          languages: values.volunteer.languages
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          availability: values.volunteer.availability,
          availableTime: "Flexible this week",
          emergencyAvailable: false,
          emergencyRadiusKm: Number.parseInt(values.volunteer.emergencyRadius, 10) || 0,
          createdAt: now,
          updatedAt: now,
          status: "pending",
          verified: false,
        }
      : null;

  const donorProfile: DonorProfile | null =
    values.role === "donor"
      ? {
          id: `donor-${values.email.trim().toLowerCase()}`,
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          helpTypes: [...values.donor.helpTypes],
          location: baseLocation,
          createdAt: now,
          updatedAt: now,
          status: "active",
          verified: false,
        }
      : null;

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    role: values.role,
    location: baseLocation,
    createdAt: now,
    updatedAt: now,
    status: values.role === "admin" ? "active" : "pending",
    verified: values.role === "admin",
    ngoProfile,
    volunteerProfile,
    donorProfile,
  };
}

export async function registerUser(
  email: string,
  password: string,
  profileData: UserProfileData,
): Promise<AuthActionResult> {
  if (!isFirebaseConfigured) {
    const uid = `local-user-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const profile = await createLocalUserProfile(
      uid,
      {
        ...profileData,
        email: email.trim(),
      },
      password,
    );

    createLocalAuthSession(profile);

    return {
      success: true,
      message: "Account created in the local demo database.",
      redirectPath: getDashboardPathForRole(profile.role),
      role: profile.role,
      userName: profile.name,
      isMock: true,
      profile,
    };
  }

  let createdUser: User | null = null;

  try {
    const auth = getFirebaseAuth();
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    createdUser = credential.user;

    const profile = await createUserProfile(credential.user.uid, {
      ...profileData,
      email: email.trim(),
    });

    return {
      success: true,
      message: "Account created successfully and profile saved to Firestore.",
      redirectPath: getDashboardPathForRole(profile.role),
      role: profile.role,
      userName: profile.name,
      isMock: false,
      profile,
    };
  } catch (error) {
    if (createdUser) {
      try {
        await createdUser.delete();
      } catch {
        // Best effort cleanup if profile creation fails after auth succeeds.
      }
    }

    throw new Error(mapAuthError(error));
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isFirebaseConfigured) {
    const profile = await loginLocalUser(email, password);

    return {
      success: true,
      message: "Signed in using the local demo database.",
      redirectPath: getDashboardPathForRole(profile.role),
      role: profile.role,
      userName: profile.name,
      isMock: true,
      profile,
    };
  }

  try {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    const profile = await getUserProfile(credential.user.uid);

    if (!profile) {
      await signOut(auth);
      throw new Error(
        "Your account was authenticated, but no Firestore user profile was found for it.",
      );
    }

    return {
      success: true,
      message: "Signed in successfully using Firebase Auth.",
      redirectPath: getDashboardPathForRole(profile.role),
      role: profile.role,
      userName: profile.name,
      isMock: false,
      profile,
    };
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function logoutUser() {
  if (!isFirebaseConfigured) {
    clearLocalAuthSession();
    return;
  }

  try {
    await signOut(getFirebaseAuth());
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured) {
    const session = getLocalAuthSession();

    if (!session) {
      return null;
    }

    return {
      uid: session.uid,
      email: session.email,
      displayName: session.name,
    } as User;
  }

  try {
    return getFirebaseAuth().currentUser;
  } catch {
    return null;
  }
}

export { createUserProfile, getUserProfile };
